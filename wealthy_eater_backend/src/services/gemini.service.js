/**
 * gemini.service.js — Wrapper for Google Gemini Generative AI API.
 *
 * Keeps the API key server-side to avoid Google's unrestricted-key enforcement
 * when calling from external automation tools (e.g., n8n).
 */

// Đọc toàn bộ danh sách key (phân cách bằng dấu phẩy), không chỉ key đầu tiên.
const rawGeminiKeys = (process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let _geminiKeyIndex = 0;
function _getGeminiKey() {
  if (rawGeminiKeys.length === 0) return null;
  const key = rawGeminiKeys[_geminiKeyIndex];
  _geminiKeyIndex = (_geminiKeyIndex + 1) % rawGeminiKeys.length;
  return key;
}

// Models được xác minh tại ai.google.dev/gemini-api/docs/models (cập nhật 2026-08)
const GEMINI_PRO_MODEL = 'gemini-3.6-flash';    // Stable — thay thế gemini-pro-latest (đã tắt)
const GEMINI_FLASH_MODEL = 'gemini-3.5-flash';    // Stable — thay thế gemini-flash-latest (đã tắt)
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_PRO_URL = `${GEMINI_BASE}/${GEMINI_PRO_MODEL}:generateContent`;
const GEMINI_FLASH_URL = `${GEMINI_BASE}/${GEMINI_FLASH_MODEL}:generateContent`;

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
        const apiKey = _getGeminiKey();
        if (!apiKey) throw new Error('GOOGLE_API_KEY not configured.');
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 20000);
        let response;
        try {
          response = await fetch(`${GEMINI_FLASH_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
              ],
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
TÌNH TRẠNG SỨC KHỎE CỦA KHÁCH HÀNG (bắt buộc tuân thủ):
- ${medicalCondition.name}${medicalCondition.category ? ` (${medicalCondition.category})` : ''}
- Hướng dẫn dinh dưỡng: "${medicalCondition.dietary_guideline || 'Không có hướng dẫn cụ thể.'}"`;

      const nc = medicalCondition.nutrient_constraints;
      if (nc && typeof nc === 'object') {
        const constraintLines = [];
        if (nc.max_sugar_g_per_day != null) constraintLines.push(`- Giới hạn đường: tối đa ${nc.max_sugar_g_per_day}g/ngày`);
        if (nc.min_fiber_g_per_day != null) constraintLines.push(`- Chất xơ tối thiểu: ${nc.min_fiber_g_per_day}g/ngày`);
        if (nc.carb_ratio_max != null) constraintLines.push(`- Tỉ lệ calo từ carb: tối đa ${Math.round(nc.carb_ratio_max * 100)}%`);
        if (nc.max_sodium_mg_per_day != null) constraintLines.push(`- Natri: tối đa ${nc.max_sodium_mg_per_day}mg/ngày`);
        if (nc.max_purine === true) constraintLines.push(`- Hạn chế thực phẩm có hàm lượng purine cao`);

        if (constraintLines.length > 0) {
          constraintSection = `
RÀNG BUỘC ĐỊNH LƯỢNG (đã được tính bởi LP Solver \u2014 KHÔNG tự ý thay đổi):
${constraintLines.join('\n')}`;
        }
      }
    }

    const prompt = `Bạn là chuyên gia dinh dưỡng lâm sàng, hỗ trợ tạo món ăn từ nguyên liệu có sẵn.

NGUYÊN LIỆU ĐẦU VÀO (định lượng đã tính bởi LP Solver \u2014 KHÔNG thêm bớt nguyên liệu):
${ingredientSummary}

TARGET MACRO CHO BỮA NÀY:
- Calories: ${targetCalories} kcal
- Protein: ${targetProtein}g | Carbs: ${targetCarbs}g | Fat: ${targetFat}g
${medicalSection}
${constraintSection}

YÊU CẦU:
1. Đề xuất TÊN món sáng tạo, MÔ TẢ ngắn (2-3 câu), ĐỘ KHÓ (EASY/MEDIUM/HARD), THỜI GIAN NẤU (phút).
2. Viết CÁC BƯỚC chế biến đúng theo định lượng nguyên liệu đã cho.
3. Nếu có ràng buộc sức khỏe, cách chế biến PHẢI phù hợp (VD: bệnh tiểu đường \u2192 không chiên xào nhiều dầu; cao huyết áp \u2192 không dùng nước mắm/muối nhiều).
4. NGHIÊM CẤM tự ý thêm hoặc đổi nguyên liệu. Dùng đúng danh sách nguyên liệu đã cung cấp.
5. Nếu bất kỳ nguyên liệu nào trong danh sách xung đột với tình trạng sức khỏe và KHÔNG thể tránh, trả field "warning" giải thích ngắn gọn \u2014 KHÔNG tự ý bỏ nguyên liệu đó.

Trả lời CHỈ bằng JSON hợp lệ theo schema sau, KHÔNG có markdown code fence:
{
  "dish_name": "string",
  "description": "string",
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "cooking_time_minutes": number,
  "steps": ["string", "string", ...],
  "warning": "string hoặc null"
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
      dish_name: `Bữa ăn được tối ưu hóa dinh dưỡng`,
      description: `Bữa ăn được tính toán cho ${ingredientSummary}. Phù hợp với mục tiêu ${targetCalories} kcal.`,
      difficulty: 'MEDIUM',
      cooking_time_minutes: 30,
      steps: [
        `Chuẩn bị nguyên liệu: ${ingredientSummary}.`,
        'Chế biến theo phương pháp lành mạnh (hấp, luộc, hoặc áp chảo ít dầu).',
        'Nêm gia vị vừa phải và phục vụ ngay.',
      ],
      warning: `Không thể tạo công thức chi tiết lúc này. Vui lòng kiểm tra thủ công để đảm bảo phù hợp với ${conditionName}.`,
    };
  }
}

module.exports = new GeminiService();
