const mongoose = require('mongoose');

const RecipeReviewSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id_fk: { 
    type: String, ref: 'User', required: true 
  },
  recipe_id_fk: { 
    type: String, ref: 'Recipe', required: true 
  },
  rating: { 
    type: Number, required: true 
  },
  comment: { 
    type: String 
  }
});

module.exports = mongoose.model('RecipeReview', RecipeReviewSchema);