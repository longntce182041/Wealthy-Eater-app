const mongoose = require('mongoose');

const ShoppingListSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  }, // Khớp với shopping_list_id_pk
  user_id_fk: { 
    type: String, 
    ref: 'User', 
    required: true 
},
  ingredient_id_fk: { 
    type: String, 
    ref: 'Ingredient', 
    required: true 
},
  ingredient_name: { 
    type: String, 
    required: true 
},
  recipe_id_fk: { 
    type: String, 
    ref: 'Recipe', 
    required: true 
},
  is_purchase: { 
    type: Boolean, 
    default: false 
},
  category: { 
    type: String 
},
  add_at: { 
    type: Date, 
    default: Date.now 
},
  purchase_at: { type: Date },
  creat_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ShoppingList', ShoppingListSchema);