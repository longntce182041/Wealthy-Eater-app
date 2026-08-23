/**
 * gemini.service.js — Wrapper for Google Gemini Generative AI API.
 *
 * Keeps the API key server-side to avoid Google's unrestricted-key enforcement
 * when calling from external automation tools (e.g., n8n).
 *
 * Now features Centralized Resilience (Circuit Breaker, Exponential Backoff, Cascade).
 */

// Key management — designed for 1 paid Tier 1 key (or multiple keys if GOOGLE_API_KEYS is comma-separated).
// Paid Tier 1 has very high RPM/TPM — 429 is rare. Cooldowns are kept short to avoid app downtime.
const rawGeminiKeys = (process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);

if (rawGeminiKeys.length === 0) {
  console.error('[GeminiService] CRITICAL: GOOGLE_API_KEY is not set. All Gemini calls will fail.');
}

const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const delay = ms => new Promise(res => setTimeout(res, ms));

// ── In-Memory Response Cache (demo stability + latency reduction) ────────────────
// Caches successful Gemini text responses for 20 minutes.
// Vision requests (inlineData) are never cached — each image is unique.
// On a cache hit, the response is returned instantly without hitting the API.
const _responseCache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const CACHE_MAX_SIZE = 100;

function _isVisionRequest(requestBody) {
  // Vision requests contain base64 image payloads — not suitable for caching
  return JSON.stringify(requestBody).includes('"inlineData"');
}

function _hashRequest(requestBody) {
  const json = JSON.stringify(requestBody);
  let h = 0;
  for (let i = 0; i < json.length; i++) {
    h = Math.imul(31, h) + json.charCodeAt(i) | 0;
  }
  return String(h >>> 0); // unsigned 32-bit
}

function _getCached(key) {
  const entry = _responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function _setCache(key, data) {
  if (_responseCache.size >= CACHE_MAX_SIZE) {
    // LRU eviction: remove the oldest inserted key
    _responseCache.delete(_responseCache.keys().next().value);
  }
  _responseCache.set(key, { data, ts: Date.now() });
}

// ── Smart Key Management with Circuit Breaker ─────────────────────────────────
const keyStats = {};
rawGeminiKeys.forEach((k) => {
  keyStats[k] = { failCount: 0, nextAvailableTime: 0 };
});

function _getHealthyKey() {
  if (rawGeminiKeys.length === 0) return null;
  const now = Date.now();
  const availableKeys = rawGeminiKeys.filter((k) => {
    if (keyStats[k].nextAvailableTime > now) return false;
    return keyStats[k].failCount < 5; // threshold matches _markKeyFailed
  });

  if (availableKeys.length === 0) {
    // If all are locked (or only 1 key configured), reset cooldowns immediately
    rawGeminiKeys.forEach((k) => {
      keyStats[k].failCount = 0;
      keyStats[k].nextAvailableTime = 0;
    });
    return rawGeminiKeys[0];
  }
  return availableKeys[Math.floor(Math.random() * availableKeys.length)];
}

function _markKeyFailed(key, reason) {
  if (!keyStats[key]) return;
  const now = Date.now();
  keyStats[key].failCount += 1;

  if (reason === 429) {
    // Paid Tier 1: 429 is transient — use short 10s cooldown instead of 60s
    // to avoid locking the only key for a long time.
    keyStats[key].nextAvailableTime = now + 10 * 1000;
  } else if (reason === 503 || reason === 'timeout') {
    // Lock after 5 consecutive failures (was 3) to tolerate short network blips
    if (keyStats[key].failCount >= 5) {
      keyStats[key].nextAvailableTime = now + 15 * 1000;
    }
  }
}

function _markKeyHealthy(key) {
  if (!keyStats[key]) return;
  keyStats[key].failCount = 0;
  keyStats[key].nextAvailableTime = 0;
}

class GeminiService {
  /**
   * Centralized Smart Fetcher
   * @param {Array<string>} models - Priority list of models
   * @param {Object} requestBody - Payload sent to Gemini
   * @param {Object} options - { timeoutMs, maxRetriesPerModel }
   */
  async executeWithResilience(models, requestBody, options = {}) {
    const { timeoutMs = 60000, maxRetriesPerModel = 3 } = options;
    let lastError = null;

    // ── Cache check (text requests only) ─────────────────────────────────────────────
    const isVision = _isVisionRequest(requestBody);
    const cacheKey = isVision ? null : _hashRequest(requestBody);
    if (cacheKey) {
      const cached = _getCached(cacheKey);
      if (cached) {
        console.info('[GeminiService] ⚡ Cache HIT — returning instant response.');
        return cached;
      }
    }
    for (const model of models) {
      const apiUrl = `${GEMINI_BASE}/${model}:generateContent`;

      for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
        const apiKey = _getHealthyKey();

        if (!apiKey) {
          console.warn('[GeminiService] No healthy API key available. Waiting 2s...');
          await delay(2000);
          break; // Skip to next model
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          console.info(`[GeminiService] Model=${model}, Attempt=${attempt}/${maxRetriesPerModel}`);

          const response = await fetch(`${apiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            const errorMsg = `Gemini HTTP ${response.status} (${model}): ${errorText}`;

            if (response.status === 429) {
              // 429: server-side rate limit — wait then retry same model (key-specific issue)
              _markKeyFailed(apiKey, 429);
              lastError = new Error(errorMsg);
              console.warn(`[GeminiService] ${errorMsg} — Rate limited. Waiting ${attempt * 2}s...`);
              await delay(attempt * 2000);
              continue;
            }

            if (response.status === 503 || response.status === 500) {
              // 503/500: server overload — cascade immediately to next model
              lastError = new Error(errorMsg);
              console.warn(`[GeminiService] ${errorMsg} — Overloaded. Cascading to next model immediately...`);
              break;
            }

            // 400/404/other: model doesn't support this request → cascade immediately
            lastError = new Error(errorMsg);
            console.warn(`[GeminiService] ${errorMsg} — Cascading to next model.`);
            break;
          }

          const data = await response.json();
          _markKeyHealthy(apiKey);
          console.info(`[GeminiService] Success with model=${model}`);
          // Store in cache for text requests (skip vision)
          if (cacheKey) _setCache(cacheKey, data);
          return data;

        } catch (err) {
          clearTimeout(timeoutId);
          lastError = err;

          if (err.name === 'AbortError') {
            // TIMEOUT: do NOT retry the same slow model — cascade immediately to next model.
            // Retrying a timed-out model wastes seconds; the next model is a better bet.
            console.warn(`[GeminiService] Model=${model} timed out after ${timeoutMs / 1000}s. Cascading to next model...`);
            _markKeyFailed(apiKey, 'timeout');
            break; // ← KEY CHANGE: was `continue` (retry same model), now cascades immediately
          }

          // Network/fatal error — cascade immediately
          console.warn(`[GeminiService] Model=${model} fatal error: ${err.message}. Cascading...`);
          break;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }

    throw lastError || new Error('All models in cascade failed.');
  }

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
        maxOutputTokens: 4096,
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

    try {
      const data = await this.executeWithResilience(GEMINI_MODELS, requestBody, { timeoutMs: 60000, maxRetriesPerModel: 3 });
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return JSON.parse(rawText);
    } catch (err) {
      console.warn('[Gemini API] All retries exhausted or invalid JSON returned. Using fallback meal template. Last Error:', err.message);
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

  async suggestRecipesFromIngredients({ ingredients = [], allergies = [], dislikes = [], medicalCondition = null, dietPreferences = [], cookingConstraints = {}, tdee = null, healthGoal = null }) {
    const ingredientsStr = ingredients.length > 0 ? ingredients.slice(0, 20).join(', ') : 'any available basic ingredients';
    const allergiesStr = allergies.length > 0 ? allergies.join(', ') : 'None';
    const dislikesStr = dislikes.length > 0 ? dislikes.join(', ') : 'None';
    const preferencesStr = dietPreferences.length > 0 ? dietPreferences.join(', ') : 'None';

    let medicalSection = 'None';
    if (medicalCondition) {
      medicalSection = `${medicalCondition.name}`;
      if (medicalCondition.dietary_guideline) {
        medicalSection += ` — Guideline: "${medicalCondition.dietary_guideline}"`;
      }
      const nc = medicalCondition.nutrient_constraints;
      if (nc && typeof nc === 'object') {
        const lines = [];
        if (nc.max_sugar_g_per_day != null) lines.push(`max sugar ${nc.max_sugar_g_per_day}g/day`);
        if (nc.min_fiber_g_per_day != null) lines.push(`min fiber ${nc.min_fiber_g_per_day}g/day`);
        if (nc.carb_ratio_max != null) lines.push(`carb ratio max ${Math.round(nc.carb_ratio_max * 100)}%`);
        if (nc.max_sodium_mg_per_day != null) lines.push(`max sodium ${nc.max_sodium_mg_per_day}mg/day`);
        if (nc.max_purine === true) lines.push('avoid high-purine foods');
        if (lines.length > 0) medicalSection += ` [Constraints: ${lines.join(', ')}]`;
      }
    }

    const { skillLevel = null, maxTimeMinutes = null } = cookingConstraints;
    const difficultyHint = skillLevel ? `Match difficulty to user's skill level: ${skillLevel}.` : '';
    const timeHint = maxTimeMinutes ? `Total cooking time MUST NOT exceed ${maxTimeMinutes} minutes.` : '';

    let calorieHint = '';
    if (tdee) {
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

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              mealName: { type: 'STRING' },
              description: { type: 'STRING' },
              cookingTimeMinutes: { type: 'INTEGER' },
              difficulty: { type: 'STRING' },
              cookingSteps: { type: 'ARRAY', items: { type: 'STRING' } },
              healthNote: { type: 'STRING' },
            },
            required: ['mealName', 'description', 'cookingTimeMinutes', 'difficulty', 'cookingSteps'],
          },
        },
      },
    };

    try {
      const data = await this.executeWithResilience(GEMINI_MODELS, requestBody, { timeoutMs: 60000, maxRetriesPerModel: 2 });

      const finishReason = data?.candidates?.[0]?.finishReason;
      if (finishReason && finishReason === 'MAX_TOKENS') {
        throw new Error(`Gemini output truncated (MAX_TOKENS).`);
      }

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed?.mealName) {
        return [parsed];
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }

      throw new Error(`Invalid JSON format.`);
    } catch (err) {
      console.warn('[Gemini suggestRecipes] Using fallback recipe. Last error:', err.message);
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
  }

  async generateMealWithMedicalContext({ ingredientSummary, targetCalories, targetProtein, targetCarbs, targetFat, medicalCondition = null }) {
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
        if (nc.max_sugar_g_per_day != null) constraintLines.push(`- Max sugar: ${nc.max_sugar_g_per_day}g/day`);
        if (nc.min_fiber_g_per_day != null) constraintLines.push(`- Min fiber: ${nc.min_fiber_g_per_day}g/day`);
        if (nc.carb_ratio_max != null) constraintLines.push(`- Max carb ratio: ${Math.round(nc.carb_ratio_max * 100)}% of calories`);
        if (nc.max_sodium_mg_per_day != null) constraintLines.push(`- Max sodium: ${nc.max_sodium_mg_per_day}mg/day`);
        if (nc.max_purine === true) constraintLines.push(`- Avoid high-purine foods`);

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
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            dish_name: { type: 'STRING' },
            description: { type: 'STRING' },
            difficulty: { type: 'STRING' },
            cooking_time_minutes: { type: 'INTEGER' },
            steps: { type: 'ARRAY', items: { type: 'STRING' } },
            warning: { type: 'STRING' },
          },
          required: ['dish_name', 'description', 'difficulty', 'cooking_time_minutes', 'steps'],
        },
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    try {
      const data = await this.executeWithResilience(GEMINI_MODELS, requestBody, { timeoutMs: 60000, maxRetriesPerModel: 3 });
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(rawText);
      if (parsed.warning === undefined) parsed.warning = null;
      return parsed;
    } catch (err) {
      console.warn('[Gemini generateMealWithMedicalContext] All retries exhausted. Using fallback. Error:', err.message);
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
}

module.exports = new GeminiService();
