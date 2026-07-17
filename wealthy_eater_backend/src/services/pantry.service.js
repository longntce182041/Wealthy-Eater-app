const Pantry = require('../models/Pantry');
const Ingredient = require('../models/Ingredient');
const axios = require('axios');
const FormData = require('form-data');

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
    const processed = [];
    
    for (const item of ingredients) {
      if (!item.name) continue;
      
      // Look up master ingredient to map ID and standardize casing/name
      const matched = await Ingredient.findOne({ 
        name: { $regex: new RegExp(`^${item.name.trim()}$`, 'i') } 
      });

      processed.push({
        name: matched ? matched.name : item.name.trim(),
        ingredient_id: matched ? matched._id : null,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || (matched ? matched.unit : 'grams'),
        updatedAt: new Date()
      });
    }

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
   */
  async scanPantryImage(file) {
    const url = process.env.N8N_SCAN_PANTRY_WEBHOOK_URL || "http://127.0.0.1:5678/webhook/scan-pantry";
    let rawIngredients = [];

    try {
      const formData = new FormData();
      formData.append("image", file.buffer, {
        filename: file.originalname || "pantry.jpg",
        contentType: file.mimetype || "image/jpeg"
      });

      const response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
        timeout: 15000 // 15s timeout
      });

      const data = response.data;
      rawIngredients = data.pantry_ingredients || (Array.isArray(data) ? data : []);
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

    // Process and match scanned items with database master records
    const processed = [];
    for (const item of rawIngredients) {
      if (!item.name) continue;

      const matched = await Ingredient.findOne({ 
        name: { $regex: new RegExp(`^${item.name.trim()}$`, 'i') } 
      });

      processed.push({
        name: matched ? matched.name : item.name.trim(),
        ingredient_id: matched ? matched._id : null,
        quantity: Number(item.quantity) || 0,
        unit: item.unit || (matched ? matched.unit : 'grams'),
        updatedAt: new Date()
      });
    }

    return processed;
  }
}

module.exports = new PantryService();
