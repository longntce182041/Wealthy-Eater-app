/**
 * gemini.service.js — Wrapper for Google Gemini Generative AI API.
 *
 * Keeps the API key server-side to avoid Google's unrestricted-key enforcement
 * when calling from external automation tools (e.g., n8n).
 */

// Read all API keys from comma-separated list (supports key rotation for rate-limit relief).
const rawGeminiKeys = (process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let _geminiKeyIndex = 0;
function _getGeminiKey() {
  if (rawGeminiKeys.length === 0) return null;
  const key = rawGeminiKeys[_geminiKeyIndex];
  _geminiKeyIndex = (_geminiKeyIndex + 1) % rawGeminiKeys.length;
  return key;
}

// Models verified at ai.google.dev/gemini-api/docs/models (updated 2026-08)
const GEMINI_PRO_MODEL   = 'gemini-3.6-flash';    // Stable — replaces gemini-pro-latest (deprecated)
const GEMINI_FLASH_MODEL = 'gemini-3.5-flash';    // Stable — replaces gemini-flash-latest (deprecated)
const GEMINI_BASE       = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_PRO_URL    = `${GEMINI_BASE}/${GEMINI_PRO_MODEL}:generateContent`;
const GEMINI_FLASH_URL  = `${GEMINI_BASE}/${GEMINI_FLASH_MODEL}:generateContent`;

if (rawGeminiKeys.length === 0) {
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
        responseSchema: {
          type: "OBJECT",
          properties: {
            mealName: { type: "STRING" },
            description: { type: "STRING" },
            difficulty: { type: "STRING" },
            cookingTimeMinutes: { type: "INTEGER" },
            cookingSteps: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  stepNumber: { type: "INTEGER" },
                  instruction: { type: "STRING" }
                },
                required: ["stepNumber", "instruction"]
              }
            }
          },
          required: ["mealName", "description", "difficulty", "cookingTimeMinutes", "cookingSteps"]
        }
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
      ]
    };

    let lastError = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const apiKey = _getGeminiKey();
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured.');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        let response;
        try {
          response = await fetch(`${GEMINI_PRO_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

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
   * Suggest recipes based on available pantry ingredients while respecting
   * the user's FULL health profile.
   *
   * @param {Object}      params
   * @param {string[]}    params.ingredients         — safe pantry items (allergics already filtered out)
   * @param {string[]}    params.allergies           — list of allergy names (for AI instruction)
   * @param {string[]}    params.dislikes            — list of disliked ingredient names
   * @param {Object|null} params.medicalCondition    — populated { name, dietary_guideline, nutrient_constraints }
   * @param {string[]}    params.dietPreferences     — e.g. ['Vegetarian', 'Keto']
   * @param {Object}      params.cookingConstraints  — { skillLevel, maxTimeMinutes }
   * @param {number|null} params.tdee               — user's total daily energy expenditure
   * @param {string|null} params.healthGoal         — e.g. 'Lose weight', 'Build muscle'
   * @returns {Promise<Array<Object>>}
   */
  async suggestRecipesFromIngredients({
    ingredients     = [],
    allergies       = [],
    dislikes        = [],
    medicalCondition = null,
    dietPreferences  = [],
    cookingConstraints = {},
    tdee            = null,
    healthGoal      = null,
  }) {
    const ingredientsStr    = ingredients.length > 0 ? ingredients.slice(0, 20).join(', ') : 'any available basic ingredients';
    const allergiesStr      = allergies.length > 0 ? allergies.join(', ') : 'None';
    const dislikesStr       = dislikes.length > 0 ? dislikes.join(', ') : 'None';
    const preferencesStr    = dietPreferences.length > 0 ? dietPreferences.join(', ') : 'None';

    // ── Medical condition section ────────────────────────────────────────────
    let medicalSection = 'None';
    if (medicalCondition) {
      medicalSection = `${medicalCondition.name}`;
      if (medicalCondition.dietary_guideline) {
        medicalSection += ` — Guideline: "${medicalCondition.dietary_guideline}"`;
      }
      const nc = medicalCondition.nutrient_constraints;
      if (nc && typeof nc === 'object') {
        const lines = [];
        if (nc.max_sugar_g_per_day  != null) lines.push(`max sugar ${nc.max_sugar_g_per_day}g/day`);
        if (nc.min_fiber_g_per_day  != null) lines.push(`min fiber ${nc.min_fiber_g_per_day}g/day`);
        if (nc.carb_ratio_max       != null) lines.push(`carb ratio max ${Math.round(nc.carb_ratio_max * 100)}%`);
        if (nc.max_sodium_mg_per_day!= null) lines.push(`max sodium ${nc.max_sodium_mg_per_day}mg/day`);
        if (nc.max_purine === true)           lines.push('avoid high-purine foods');
        if (lines.length > 0) medicalSection += ` [Constraints: ${lines.join(', ')}]`;
      }
    }

    // ── Cooking constraints section ─────────────────────────────────────────
    const { skillLevel = null, maxTimeMinutes = null } = cookingConstraints;
    const difficultyHint  = skillLevel
      ? `Match difficulty to user's skill level: ${skillLevel}.`
      : '';
    const timeHint        = maxTimeMinutes
      ? `Total cooking time MUST NOT exceed ${maxTimeMinutes} minutes.`
      : '';

    // ── Calorie target guidance ─────────────────────────────────────────────
    let calorieHint = '';
    if (tdee) {
      // Approximate single-meal target as ~33% of TDEE
      const perMealTarget = Math.round(tdee * 0.33);
      calorieHint = `Target approximately ${perMealTarget} kcal per meal (based on TDEE ${Math.round(tdee)} kcal/day${healthGoal ? `, goal: ${healthGoal}` : ''}).`;
    }

    const prompt = `You are a clinical dietitian and professional chef. Suggest exactly 1 recipe using the provided pantry ingredients that respects all health constraints below.

PANTRY INGREDIENTS (use these — do not add others unless essential for cooking method):
${ingredientsStr}

HEALTH CONSTRAINTS (STRICTLY ENFORCE):
- Allergies (MUST NEVER use): ${allergiesStr}
- Dislikes (avoid if possible): ${dislikesStr}
- Diet Preferences: ${preferencesStr}
- Medical Condition: ${medicalSection}

COOKING CONSTRAINTS:
- ${difficultyHint || 'Any difficulty level.'}
- ${timeHint || 'No time limit.'}
- ${calorieHint || 'No specific calorie target.'}

RULES:
1. NEVER include any ingredient from the Allergies list — even as a minor ingredient.
2. Respect the Medical Condition dietary guidelines when choosing cooking method and portion size.
3. If the user has diet preferences (e.g., Vegetarian), the recipe MUST comply.
4. Keep cooking steps concise (max 20 words each).

Respond ONLY with a JSON array containing exactly 1 recipe object with these keys:
- "mealName": string
- "description": 1 sentence string
- "cookingTimeMinutes": integer
- "difficulty": "Easy" | "Medium" | "Hard"
- "cookingSteps": array of 3–5 short strings
- "healthNote": string (brief note on why this recipe suits the user's health profile, or null)

Output ONLY the JSON array. No extra text, no markdown fences.`;

    let lastError = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const apiKey = _getGeminiKey();
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured.');
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 30000); // 30s — longer for richer output
        let response;
        try {
          response = await fetch(`${GEMINI_FLASH_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      mealName:           { type: 'STRING' },
                      description:        { type: 'STRING' },
                      cookingTimeMinutes: { type: 'INTEGER' },
                      difficulty:         { type: 'STRING' },
                      cookingSteps:       { type: 'ARRAY', items: { type: 'STRING' } },
                      healthNote:         { type: 'STRING' },
                    },
                    required: ['mealName', 'description', 'cookingTimeMinutes', 'difficulty', 'cookingSteps'],
                  },
                },
              },
            }),
            signal: controller2.signal,
          });
        } finally {
          clearTimeout(timeoutId2);
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API HTTP error ${response.status}: ${errText}`);
        }

        const resData = await response.json();

        const finishReason = resData?.candidates?.[0]?.finishReason;
        // MAX_TOKENS: response was cut mid-way — retrying with same config won't help.
        // Fall through to the fallback below instead of wasting 2 more retries.
        if (finishReason && finishReason !== 'STOP') {
          if (finishReason === 'MAX_TOKENS') {
            console.warn('[Gemini suggestRecipes] MAX_TOKENS hit — skipping retries, using fallback.');
            break; // exit retry loop → use fallback
          }
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

    // Fallback: return a minimal valid recipe so the endpoint does not 500.
    // This covers MAX_TOKENS (prompt too long for model context) and transient API failures.
    console.warn('[Gemini suggestRecipes] Using fallback recipe. Last error:', lastError?.message);
    const safeIngredientStr = ingredients.slice(0, 5).join(', ') || 'available ingredients';
    return [{
      mealName: 'Simple Pantry Bowl',
      description: `A quick, healthy bowl made with ${safeIngredientStr}. Adjust seasoning to taste.`,
      cookingTimeMinutes: 20,
      difficulty: 'Easy',
      cookingSteps: [
        `Prepare and wash all ingredients: ${safeIngredientStr}.`,
        'Cook using your preferred method (steam, boil, or light stir-fry).',
        'Combine in a bowl and season lightly with salt and pepper.',
        'Serve immediately while warm.',
      ],
      healthNote: 'AI suggestion temporarily unavailable. This is a basic fallback recipe — please consult NutriBot for personalized advice.',
    }];
  }

  /**
   * UC-Regenerate — Generate a meal with full medical condition context.
   *
   * Called by the regenerate-ai endpoint when a nutritionist wants to replace
   * a specific meal slot with an AI-generated suggestion that respects the
   * client's medical condition constraints.
   *
   * Unlike generateMealPlan(), this method:
   * - Accepts a full medicalCondition object (not just dietType)
   * - Includes nutrient_constraints in the prompt so Gemini can tailor advice
   * - Returns a `warning` field when ingredients conflict with the condition
   * - Uses HARD guardrail: MUST NOT suggest removing/replacing ingredients
   *   (ingredient list is set by LP solver, Gemini only generates cooking steps)
   *
   * @param {Object} params
   * @param {string} params.ingredientSummary        — e.g. "150g Chicken Breast, 200g Brown Rice"
   * @param {number} params.targetCalories
   * @param {number} params.targetProtein
   * @param {number} params.targetCarbs
   * @param {number} params.targetFat
   * @param {Object|null} params.medicalCondition    — { name, category, dietary_guideline, nutrient_constraints }
   * @returns {Promise<Object>} { dish_name, description, difficulty, cooking_time_minutes, steps[], warning }
   */
  async generateMealWithMedicalContext({
    ingredientSummary,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    medicalCondition = null,
  }) {
    // ── Build medical condition section of prompt ──────────────────────────
    let medicalSection = '';
    let constraintSection = '';

    if (medicalCondition) {
      medicalSection = `
CLIENT MEDICAL CONDITION (must be strictly followed):
- ${medicalCondition.name}${medicalCondition.category ? ` (${medicalCondition.category})` : ''}
- Dietary guideline: "${medicalCondition.dietary_guideline || 'No specific guideline provided.'}"`;

      const nc = medicalCondition.nutrient_constraints;
      if (nc && typeof nc === 'object') {
        const constraintLines = [];
        if (nc.max_sugar_g_per_day != null)   constraintLines.push(`- Max sugar: ${nc.max_sugar_g_per_day}g/day`);
        if (nc.min_fiber_g_per_day != null)   constraintLines.push(`- Min fiber: ${nc.min_fiber_g_per_day}g/day`);
        if (nc.carb_ratio_max != null)         constraintLines.push(`- Max carb ratio: ${Math.round(nc.carb_ratio_max * 100)}% of calories`);
        if (nc.max_sodium_mg_per_day != null)  constraintLines.push(`- Max sodium: ${nc.max_sodium_mg_per_day}mg/day`);
        if (nc.max_purine === true)            constraintLines.push(`- Avoid high-purine foods`);

        if (constraintLines.length > 0) {
          constraintSection = `
NUTRIENT CONSTRAINTS (pre-calculated by LP Solver — DO NOT modify):
${constraintLines.join('\n')}`;
        }
      }
    }

    const prompt = `You are a clinical dietitian and professional chef. Your task is to create a recipe from the provided ingredients.

INGREDIENTS (quantities pre-calculated by LP Solver — DO NOT add or replace any ingredient):
${ingredientSummary}

TARGET MACROS FOR THIS MEAL:
- Calories: ${targetCalories} kcal
- Protein: ${targetProtein}g | Carbs: ${targetCarbs}g | Fat: ${targetFat}g
${medicalSection}
${constraintSection}

REQUIREMENTS:
1. Propose a creative DISH NAME, a short DESCRIPTION (2–3 sentences), DIFFICULTY (EASY/MEDIUM/HARD), and COOKING TIME in minutes.
2. Write detailed COOKING STEPS using the exact ingredient quantities provided.
3. If health constraints exist, the cooking method MUST comply (e.g., diabetes → avoid deep-frying; hypertension → minimize salt/soy sauce).
4. STRICTLY FORBIDDEN to add, swap, or remove any ingredient from the list above.
5. If any ingredient conflicts with the medical condition and cannot be avoided, set the "warning" field with a brief explanation — do NOT silently remove the ingredient.

Respond ONLY with a valid JSON object matching the schema below. No markdown fences:
{
  "dish_name": "string",
  "description": "string",
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "cooking_time_minutes": number,
  "steps": ["string", "string", ...],
  "warning": "string or null"
}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            dish_name:             { type: 'STRING' },
            description:           { type: 'STRING' },
            difficulty:            { type: 'STRING' },
            cooking_time_minutes:  { type: 'INTEGER' },
            steps:                 { type: 'ARRAY', items: { type: 'STRING' } },
            warning:               { type: 'STRING' },
          },
          required: ['dish_name', 'description', 'difficulty', 'cooking_time_minutes', 'steps'],
        },
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    let lastError = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const apiKey = _getGeminiKey();
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured.');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        let response;
        try {
          response = await fetch(`${GEMINI_PRO_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(rawText);

        // Normalize: ensure warning field is null (not missing) if not present
        if (parsed.warning === undefined) parsed.warning = null;

        return parsed;
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini generateMealWithMedicalContext] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    console.warn('[Gemini generateMealWithMedicalContext] All retries exhausted. Using fallback.');
    // Fallback: safe response that does not suggest any changes
    const conditionName = medicalCondition?.name || 'Unknown';
    return {
      dish_name: 'Nutritionally Optimized Meal',
      description: `A meal calculated for: ${ingredientSummary}. Targeting ${targetCalories} kcal.`,
      difficulty: 'MEDIUM',
      cooking_time_minutes: 30,
      steps: [
        `Prepare all ingredients: ${ingredientSummary}.`,
        'Cook using a healthy method (steaming, boiling, or light stir-fry with minimal oil).',
        'Season lightly and serve immediately.',
      ],
      warning: `Could not generate a detailed recipe at this time. Please manually verify that this meal is suitable for: ${conditionName}.`,
    };
  }
}

module.exports = new GeminiService();
