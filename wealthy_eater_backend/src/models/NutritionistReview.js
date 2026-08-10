const mongoose = require("mongoose");

const NutritionistReviewSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    nutritionist_id: {
      type: String,
      ref: "Nutritionist",
      required: true,
      index: true,
    },
    user_id: {
      type: String,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true, // Tự động tạo created_at/createdAt và updated_at/updatedAt
    versionKey: false,
  }
);

module.exports = mongoose.model("NutritionistReview", NutritionistReviewSchema);