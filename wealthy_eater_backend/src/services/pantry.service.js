const Pantry = require('../models/Pantry');
const Ingredient = require('../models/Ingredient');
const UserDietary = require('../models/UserDietary');
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
        timeout: 60000 // 60s timeout
      });

      const data = response.data;
      rawIngredients = data.inventory || data.pantry_ingredients || (Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('⚠️ [PantryService] n8n scan service failed or offline:', error.message);
      
      const apiKey = (process.env.GOOGLE_API_KEY || '').split(',')[0].trim();
      if (apiKey) {
        console.info("⚡ [Gemini Fallback]: Initiating direct Gemini Vision API analysis for Pantry Scan...");
        try {
          const model = process.env.GEMINI_VISION_MODEL || "gemini-flash-latest";
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          
          const prompt = [
            "You are an expert culinary AI assistant.",
            "Analyze the image of this pantry or fridge and return a list of visible ingredients.",
            "Output exclusively a minified JSON array of objects without markdown. Each object must have:",
            '- "name": string (simple ingredient name, e.g., "Egg", "Milk", "Tomato")',
            '- "quantity": number (estimated amount)',
            '- "unit": string (e.g., "units", "ml", "g")'
          ].join("\\n");

          const geminiPayload = {
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: file.mimetype || "image/jpeg",
                      data: file.buffer.toString("base64"),
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          };

          const geminiResponse = await axios.post(geminiUrl, geminiPayload, { timeout: 60000 });
          const rawText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
          const cleanJsonStr = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          rawIngredients = JSON.parse(cleanJsonStr);
        } catch (geminiError) {
          console.error('❌ [Gemini Fallback Failed]:', geminiError.message);
          const AppError = require('../utils/AppError');
          throw new AppError('Dịch vụ quét tủ lạnh và AI dự phòng đều không khả dụng. Vui lòng thử lại.', 503, 'SERVICE_UNAVAILABLE');
        }
      } else {
        const AppError = require('../utils/AppError');
        throw new AppError('Dịch vụ quét tủ lạnh không khả dụng và chưa cấu hình AI dự phòng.', 503, 'SERVICE_UNAVAILABLE');
      }
    }

    // Normalize all items to objects
    const normalizedItems = rawIngredients
      .map(item => typeof item === 'string' ? { name: item, quantity: 1, unit: 'units' } : item)
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
   * UC: Suggest meals based on pantry ingredients and user dietary profile.
   * @param {string} userId 
   */
  async suggestRecipesFromPantry(userId) {
    const pantry = await Pantry.findOne({ user_id: userId });
    const ingredients = pantry && pantry.pantry_ingredients ? pantry.pantry_ingredients : [];
    const ingredientNames = ingredients.map(i => i.name).filter(Boolean);

    // Guard: do not call Gemini if pantry is empty — saves tokens and returns meaningful error
    if (ingredientNames.length === 0) {
      const AppError = require('../utils/AppError');
      throw new AppError('Your pantry is empty. Add some ingredients first.', 400, 'PANTRY_EMPTY');
    }

    // Fetch user dietary preferences (allergies & dislikes) in parallel with above for efficiency
    const userDietary = await UserDietary.findOne({ user_id: userId })
      .populate('allergies', 'name')
      .populate('dislike_ingredients', 'name');

    const allergies = userDietary && userDietary.allergies 
      ? userDietary.allergies.map(a => a.name).filter(Boolean)
      : [];
    const dislikes = userDietary && userDietary.dislike_ingredients 
      ? userDietary.dislike_ingredients.map(d => d.name).filter(Boolean)
      : [];

    return await geminiService.suggestRecipesFromIngredients({
      ingredients: ingredientNames,
      allergies,
      dislikes
    });
  }
}

module.exports = new PantryService();
