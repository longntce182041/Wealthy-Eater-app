/**
 * gemini.service.js — Wrapper for Google Gemini Generative AI API.
 *
 * Keeps the API key server-side to avoid Google's unrestricted-key enforcement
 * when calling from external automation tools (e.g., n8n).
 */

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
    const prompt = `You are a professional nutritionist and chef. Given the following optimized ingredients from a linear programming meal solver, create a complete meal plan entry.

Ingredients allocated: ${ingredientSummary}
Diet type: ${dietType}
Total calories: ${targetCalories} kcal
Protein: ${targetProtein}g | Carbs: ${targetCarbs}g | Fat: ${targetFat}g

Respond ONLY with valid JSON in this exact format, no markdown, no extra text:
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
        temperature: 0.7,
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
}

module.exports = new GeminiService();
