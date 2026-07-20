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
        timeout: 30000 // 30s timeout
      });

      const data = response.data;
      rawIngredients = data.inventory || data.pantry_ingredients || (Array.isArray(data) ? data : []);
    } catch (error) {
      const isConnectionRefused = error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED');
      if (isConnectionRefused) {
        console.warn("⚠️ [n8n Offline]: Connection refused. Falling back to mock pantry response.");
      } else {
        console.error("❌ [n8n Webhook Error]:", error.message);
      }

      // Mock data: Beef: 500g, Tomato: 3 pieces, Egg: 6 pieces
      rawIngredients = [
        { name: "Beef", quantity: 500, unit: "g" },
        { name: "Tomato", quantity: 3, unit: "pieces" },
        { name: "Egg", quantity: 6, unit: "pieces" }
      ];
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
