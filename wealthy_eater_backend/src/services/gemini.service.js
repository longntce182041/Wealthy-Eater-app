/**
 * gemini.service.js — Wrapper for Google Gemini Generative AI API.
 *
 * Keeps the API key server-side to avoid Google's unrestricted-key enforcement
 * when calling from external automation tools (e.g., n8n).
 */

const GEMINI_API_KEY = (process.env.GOOGLE_API_KEY || '').split(',')[0].trim();
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

if (!GEMINI_API_KEY) {
  console.error('[GeminiService] CRITICAL: GOOGLE_API_KEY is not set. All Gemini calls will fail.');
}

class GeminiService {
  /**
   * UC-39 — Generate a meal name and cooking steps from LP solver output.
   *
   * @param {Object} params
   * @param {string} params.ingredientSummary  — e.g. "150g Salmon Fillet, 200g White Rice"
   * @param {string} params.dietType           — e.g. "LOW_CARB"
   * @param {number} params.targetCalories
   * @param {number} params.targetProtein
   * @param {number} params.targetCarbs
   * @param {number} params.targetFat
   * @returns {Promise<Object>} { mealName, description, difficulty, cookingTimeMinutes, cookingSteps[] }
   */
  async generateMealPlan({ ingredientSummary, dietType, targetCalories, targetProtein, targetCarbs, targetFat }) {
    const prompt = `ROLE INSTRUCTIONS:
You are an elite clinical research dietitian and executive culinary development chef specializing in high-precision therapeutic meal preparation. Your task is to translate a raw, mathematically optimized list of ingredients and their exact gram allocations into an appetizing, clear, and professional human-friendly recipe.

INPUT CONSTRAINT PARAMETERS:
You must strictly build the recipe using the exact ingredient names and mass allocations specified below:
${ingredientSummary}

Diet Protocol: ${dietType}
Target Energy: ${targetCalories} kcal | Protein: ${targetProtein}g | Carbohydrates: ${targetCarbs}g | Fat: ${targetFat}g

CRITICAL EXECUTION GUARDRAILS:
1. MANDATORY INGREDIENT CONFORMANCE: You MUST use ONLY the exact ingredients provided in the input list.
2. ZERO ADDITIONS POLICY: You are STRICTLY FORBIDDEN from introducing any additional ingredients, spices, oils, herbs, condiments, seasoning mixes, or liquids that are not explicitly defined in the provided input parameters (even if you believe they are necessary for flavor, texture, or browning).
3. MASS RETENTION ACCURACY: You must use the exact gram weights provided in the input data. Do not scale, multiply, or round the portion sizes.
4. CULINARY VIABILITY: All preparation instructions must use realistic, healthy, and accessible kitchen validation techniques (e.g., grilling, baking, boiling, steaming) that can be easily executed at home using standard residential equipment.

OUTPUT EXECUTION SCHEMA:
You must output your response exclusively as a minified, valid JSON object that strictly adheres to the requested application schema. Do not append any conversational prefaces, introductory text, or markdown code block fences (e.g., do not wrap with \`\`\`json ... \`\`\`). Your output must start with '{' and end with '}'.

Required JSON schema:
{
  "mealName": "string — creative dish name combining these ingredients",
  "description": "string — 1-2 sentence appetizing description",
  "difficulty": "Easy|Medium|Hard",
  "cookingTimeMinutes": number,
  "cookingSteps": [
    { "stepNumber": 1, "instruction": "string" },
    { "stepNumber": 2, "instruction": "string" }
  ]
}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    };

    let lastError = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        try {
          return JSON.parse(rawText);
        } catch {
          // If JSON is malformed, break to use fallback
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini API] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.warn('[Gemini API] All retries exhausted or invalid JSON returned. Using fallback meal template.');
    // Fallback if Gemini response fails or isn't clean JSON
    return {
      mealName: `Optimized ${dietType} Meal`,
      description: `A nutritionally optimized meal with ${ingredientSummary}.`,
      difficulty: 'Medium',
      cookingTimeMinutes: 30,
      cookingSteps: [
        { stepNumber: 1, instruction: `Prepare ingredients: ${ingredientSummary}.` },
        { stepNumber: 2, instruction: 'Cook according to preferred method and season to taste.' },
        { stepNumber: 3, instruction: 'Plate and serve immediately.' },
      ],
    };
  }

  /**
   * Suggest recipes based on available pantry ingredients while avoiding user allergies & dislikes.
   *
   * @param {Object} params
   * @param {string[]} params.ingredients
   * @param {string[]} params.allergies
   * @param {string[]} params.dislikes
   * @returns {Promise<Array<Object>>} List of suggested recipes
   */
  async suggestRecipesFromIngredients({ ingredients = [], allergies = [], dislikes = [] }) {
    const ingredientsStr = ingredients.length > 0 ? ingredients.slice(0, 20).join(', ') : 'any available basic ingredients';
    const allergiesStr = allergies.length > 0 ? allergies.join(', ') : 'None';
    const dislikesStr = dislikes.length > 0 ? dislikes.join(', ') : 'None';

    const prompt = `You are a professional chef. Generate exactly 1 recipe suggestion using the provided pantry ingredients.

Pantry: ${ingredientsStr}
Allergies (strictly avoid): ${allergiesStr}
Dislikes (avoid if possible): ${dislikesStr}

Respond ONLY with a JSON array containing exactly 1 object. The object must have these exact keys:
- "mealName": short recipe name (string)
- "description": 1 sentence (string)
- "cookingTimeMinutes": integer
- "difficulty": one of "Easy", "Medium", or "Hard"
- "cookingSteps": array of 3-5 short strings (each step max 20 words)

Output ONLY the JSON array. No extra text, no markdown.`;

    let lastError = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json',
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    mealName: { type: "STRING" },
                    description: { type: "STRING" },
                    cookingTimeMinutes: { type: "INTEGER" },
                    difficulty: { type: "STRING" },
                    cookingSteps: { type: "ARRAY", items: { type: "STRING" } }
                  },
                  required: ["mealName", "description", "cookingTimeMinutes", "difficulty", "cookingSteps"]
                }
              }
            },
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API HTTP error ${response.status}: ${errText}`);
        }

        const resData = await response.json();

        const finishReason = resData?.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
          throw new Error(`Gemini output truncated (finishReason: ${finishReason}). Will retry.`);
        }

        const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        // Normalize: handle single object returned instead of array
        if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed?.mealName) {
          return [parsed];
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }

        throw new Error(`Parsed result is not a valid recipe. Received: ${JSON.stringify(parsed).substring(0, 200)}`);
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini suggestRecipes] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    const detail = `[Gemini suggestRecipes] All retries exhausted: ${lastError?.message}`;
    console.error(detail);
    throw new Error(detail);
  }
}

module.exports = new GeminiService();
