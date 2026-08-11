const mongoose = require("mongoose");

const APPROVAL_STATUSES = [
  "pending",
  "approval",
  "reject",
  "PENDING",
  "APPROVED",
  "REJECTED",
];

const NutritionistSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    user_id: {
      type: String,
      ref: "User",
      required: true,
      index: true,
      alias: "userId",
    },

    full_name: { type: String, trim: true, default: "" },
    specialization: { type: String, trim: true },
    
    // 2. BỔ SUNG TRƯỜNG ABOUT MÔ TẢ BẢN THÂN
    about: { type: String, trim: true, default: "" },

    professional_title: {
      type: String,
      trim: true,
      alias: "professionalTitle",
    },
    license_number: { type: String, trim: true, alias: "licenseNumber" },
    certification_url: { type: String, trim: true, alias: "certificateUrl" },
    certificate_public_id: {
      type: String,
      trim: true,
      alias: "certificatePublicId",
    },

    service_fee: { type: Number, required: true, min: 0, alias: "serviceFee" },
    approval_status: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: "PENDING",
      alias: "approvalStatus",
      index: true,
    },
    // 3. ĐỔI DEFAULT THÀNH 0 ĐỂ HỖ TRỢ HIỂN THỊ "Chưa có đánh giá"
    average_rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      alias: "averageRating",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

NutritionistSchema.index(
  { license_number: 1 },
  {
    unique: true,
    partialFilterExpression: { license_number: { $exists: true, $ne: "" } },
  },
);

NutritionistSchema.index({ user_id: 1, approval_status: 1 });
NutritionistSchema.index({ approval_status: 1, average_rating: -1 });

module.exports = mongoose.model("Nutritionist", NutritionistSchema);