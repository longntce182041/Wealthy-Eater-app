const { default: mongoose } = require("mongoose");

mongoose.model("NutritionistReview", new mongoose.Schema({
    nutritionist_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Nutritionist"
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    rating: {
        type: Number,
        required: true
    },
    review: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}));

module.exports = mongoose.model("NutritionistReview", NutritionistReviewSchema);
