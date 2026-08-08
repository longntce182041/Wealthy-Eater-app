const mongoose = require('mongoose');

const PantryIngredientSchema = new mongoose.Schema({
  ingredient_id: {
    type: String,
    ref: 'Ingredient',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

const PantrySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    user_id: {
      type: String,
      ref: 'User',
      required: true,
      unique: true,
    },
    pantry_ingredients: [PantryIngredientSchema],
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

module.exports = mongoose.model('Pantry', PantrySchema);
