const mongoose = require('mongoose');

const UserAiRecipeSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  }, 
  user_id: {
    type: String,
    ref: 'UserProfile',
    required: true
  },
  mealName: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  cookingTimeMinutes: { 
    type: Number 
  },
  difficulty: { 
    type: String 
  },
  cookingSteps: { 
    type: [String],
    default: []
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Indexing for performance
UserAiRecipeSchema.index({ user_id: 1, created_at: -1 });
UserAiRecipeSchema.index({ user_id: 1, mealName: 1 });

module.exports = mongoose.model('UserAiRecipe', UserAiRecipeSchema);
