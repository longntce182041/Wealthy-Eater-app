const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  }, 
  name: { 
    type: String, required: true },
  description: { 
    type: String 
  },
  image_url: { 
    type: String 
  },
  cooking_time: { 
    type: Number 
  },
  base_servings: { 
    type: Number, default: 1 
  },
  status: { 
    type: String 
  },
  level_cooking: { 
    type: String 
  },
  cooking_step: { 
    type: String 
  }
});

module.exports = mongoose.model('Recipe', RecipeSchema);