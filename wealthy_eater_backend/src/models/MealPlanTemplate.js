const mongoose = require("mongoose");

const templateMealSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ],
      required: true,
    },
    mealPeriod: {
      type: String,
      enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"],
      required: true,
    },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: true,
    },
    customizedServingsGram: { type: Number, required: true },
    targetCalories: { type: Number, required: true },
  },
  { _id: false },
);

const mealPlanTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  minTDEE: { type: Number, required: true },
  maxTDEE: { type: Number, required: true },
  dietaryPreference: { type: String, required: true },
  excludedAllergies: [{ type: String }],
  medicalConditionTags: [{ type: String }],
  totalCalories: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  templateMeals: [templateMealSchema],
});

module.exports = mongoose.model("MealPlanTemplate", mealPlanTemplateSchema);
