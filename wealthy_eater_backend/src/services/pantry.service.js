const Pantry = require('../models/Pantry');
const Ingredient = require('../models/Ingredient');
const UserDietary = require('../models/UserDietary');
const UserProfile = require('../models/UserProfile');
const geminiService = require('./gemini.service');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Escapes special regex characters to prevent ReDoS attacks.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class PantryService {
  /**
   * Get or initialize the user's pantry.
   * @param {string} userId 
   */
  async getPantry(userId) {
    let pantry = await Pantry.findOne({ user_id: userId });
    if (!pantry) {
      pantry = new Pantry({ user_id: userId, pantry_ingredients: [] });
      await pantry.save();
    }
    return pantry;
  }

  /**
   * Manually update the user's virtual fridge, matching items against master ingredients.
   * @param {string} userId 
   * @param {Array} ingredients 
   */
  async updatePantryManual(userId, ingredients) {
    // Filter valid items upfront
    const validItems = ingredients.filter(item => item.name && item.name.trim());

    // Bulk query: 1 DB call instead of N (N+1 fix)
    const names = validItems.map(item => item.name.trim());
    const matchedIngredients = await Ingredient.find({
      name: { $in: names.map(n => new RegExp(`^${escapeRegex(n)}$`, 'i')) }
    });
    const matchMap = new Map(matchedIngredients.map(m => [m.name.toLowerCase(), m]));

    const processed = validItems.map(item => {
      const matched = matchMap.get(item.name.trim().toLowerCase());
      return {
        name: matched ? matched.name : item.name.trim(),
        ingredient_id: matched ? matched._id : null,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || (matched ? matched.unit : 'grams'),
        updatedAt: new Date()
      };
    });

    let pantry = await Pantry.findOne({ user_id: userId });
    if (!pantry) {
      pantry = new Pantry({ user_id: userId, pantry_ingredients: processed });
    } else {
      pantry.pantry_ingredients = processed;
    }

    await pantry.save();
    return pantry;
  }

  /**
   * Uploads an image of the pantry to n8n for scanning.
   * Falls back to mock data if n8n is offline (ECONNREFUSED).
   * Matches scanned items against master ingredients.
   * @param {Object} file 
   * @param {string} userId
   */
  async scanPantryImage(file, userId) {
    const url = process.env.N8N_SCAN_PANTRY_WEBHOOK_URL || "http://localhost:5678/webhook-test/detect-pantry";
    let rawIngredients = [];

    try {
      const base64Image = file.buffer.toString('base64');

      const payload = {
        user_id: userId || "backend_user",
        image_base64: base64Image,
        mime_type: file.mimetype || "image/jpeg"
      };

      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000 // 5s — fast-fail so Gemini fallback activates quickly if n8n is offline
      });

      const data = response.data;
      rawIngredients = data.inventory || data.pantry_ingredients || (Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('⚠️ [PantryService] n8n scan service failed or offline:', error.message);

      console.info("⚡ [Gemini Fallback]: Initiating direct Gemini Vision API analysis for Pantry Scan...");
      try {
        const models = [
          process.env.GEMINI_VISION_MODEL || 'gemini-3.6-flash',
          'gemini-3.5-flash',
        ];

        const prompt = [
          "You are an expert culinary AI assistant.",
          "Analyze the image of this pantry or fridge and return a list of visible ingredients.",
          "Output exclusively a minified JSON array of objects without markdown. Each object must have:",
          '- "name": string (simple, clean ingredient name, e.g., "Egg", "Milk", "Tomato")',
          '- "quantity": number (estimated realistic amount based on visual size)',
          '- "unit": string. MUST be exactly one of: "g", "kg", "ml", "l", "pieces", "bunch". Use "pieces" for countable solid items (e.g. eggs, tomatoes) instead of generic terms.'
        ].join("\n");

        const requestBody = {
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: file.mimetype || "image/jpeg",
                    data: file.buffer.toString("base64"),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                  unit: { type: "STRING" }
                },
                required: ["name", "quantity", "unit"]
              }
            }
          },
        };

        const data = await geminiService.executeWithResilience(models, requestBody, { timeoutMs: 60000, maxRetriesPerModel: 3 });
        
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("Empty response from Gemini.");

        const cleanJsonStr = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        rawIngredients = JSON.parse(cleanJsonStr);
      } catch (geminiError) {
        console.error('❌ [Gemini Fallback Failed]:', geminiError.message);
        const AppError = require('../utils/AppError');
        throw new AppError('Pantry scan service and AI fallback are both unavailable. Please try again.', 503, 'SERVICE_UNAVAILABLE');
      }
    }

    // Normalize all items to objects
    const normalizedItems = rawIngredients
      .map(item => typeof item === 'string' ? { name: item, quantity: 1, unit: 'pieces' } : item)
      .filter(item => item && item.name && item.name.trim());

    // Bulk query: 1 DB call instead of N (N+1 fix)
    const names = normalizedItems.map(item => item.name.trim());
    const matchedIngredients = await Ingredient.find({
      name: { $in: names.map(n => new RegExp(`^${escapeRegex(n)}$`, 'i')) }
    });
    const matchMap = new Map(matchedIngredients.map(m => [m.name.toLowerCase(), m]));

    const processed = normalizedItems.map(item => {
      const matched = matchMap.get(item.name.trim().toLowerCase());
      return {
        name: matched ? matched.name : item.name.trim(),
        ingredient_id: matched ? matched._id : null,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || (matched ? matched.unit : 'units'),
        updatedAt: new Date()
      };
    });

    return processed;
  }

  /**
   * UC: Suggest meals based on pantry ingredients and FULL user health profile.
   *
   * Health checks performed:
   *  ✅ Allergies       — allergic ingredients REMOVED from pantry list + AI told to avoid
   *  ✅ Dislikes        — AI told to avoid
   *  ✅ Medical Condition — dietary_guideline + nutrient_constraints passed to AI
   *  ✅ Diet Preferences — Vegetarian/Vegan/Keto etc. passed to AI
   *  ✅ Cooking Skill   — AI asked to match difficulty
   *  ✅ Cooking Time    — AI asked to respect max available time
   *  ✅ Health Goal     — TDEE + goal passed so AI can estimate calorie target per meal
   *
   * @param {string} userId
   */
  async suggestRecipesFromPantry(userId) {
    // Load all health data in parallel for efficiency
    const [pantry, userDietary, userProfile] = await Promise.all([
      Pantry.findOne({ user_id: userId }),
      UserDietary.findOne({ user_id: userId })
        .populate({ path: 'medical_condition_id', select: 'name dietary_guideline nutrient_constraints' })
        .populate({ path: 'allergies', select: 'name' })
        .populate({ path: 'dislike_ingredients', select: 'name' }),
      UserProfile.findOne({ user_id: userId }).lean(),
    ]);

    const ingredients = pantry?.pantry_ingredients ?? [];

    // Guard: do not call Gemini if pantry is empty — saves tokens
    if (ingredients.length === 0) {
      const AppError = require('../utils/AppError');
      throw new AppError('Your pantry is empty. Add some ingredients first.', 400, 'PANTRY_EMPTY');
    }

    // ── Resolve health constraints ─────────────────────────────────────────
    const allergies = userDietary?.allergies?.map((a) => a.name).filter(Boolean) ?? [];
    const dislikes = userDietary?.dislike_ingredients?.map((d) => d.name).filter(Boolean) ?? [];
    const dietPreferences = userDietary?.diet_preferences ?? [];
    const medicalCondition = userDietary?.medical_condition_id ?? null; // populated object or null

    // ── SAFETY: Filter allergic ingredients OUT of pantry before sending to AI
    // Prevents AI from suggesting a recipe that uses an ingredient the user is allergic to,
    // even if that ingredient is physically in their fridge.
    const allergySet = new Set(allergies.map((a) => a.toLowerCase()));
    const safeIngredients = ingredients
      .map((i) => i.name)
      .filter(Boolean)
      .filter((name) => !allergySet.has(name.toLowerCase()));

    if (safeIngredients.length === 0) {
      const AppError = require('../utils/AppError');
      throw new AppError(
        'All pantry ingredients conflict with your allergy list. Please update your pantry.',
        400,
        'PANTRY_ALL_ALLERGIC'
      );
    }

    // ── Build cooking constraints from profile ─────────────────────────────
    const cookingConstraints = {
      skillLevel: userDietary?.cooking_skill_level ?? null,
      maxTimeMinutes: userDietary?.available_cooking_time ?? null,
    };

    // ── Build calorie guidance from TDEE ───────────────────────────────────
    // Rough split: breakfast 25%, lunch 35%, dinner 30%, snack 10%
    const tdee = userProfile?.tdee ?? null;
    const healthGoal = userProfile?.health_goal ?? null;

    return await geminiService.suggestRecipesFromIngredients({
      ingredients: safeIngredients,
      allergies,
      dislikes,
      medicalCondition,
      dietPreferences,
      cookingConstraints,
      tdee,
      healthGoal,
    });
  }
}

module.exports = new PantryService();
