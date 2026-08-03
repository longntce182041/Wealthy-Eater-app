const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    email:                  { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone:                  { type: String, unique: true, sparse: true, trim: true },
    avatar:                 { type: String, default: null },
    password_hash:          { type: String, default: null },
    role: {
      type: String,
      enum: ['customer', 'admin', 'nutritionist'],
      required: true,
      default: 'customer',
    },
    // 🟢 THÊM TRƯỜNG STATUS VÀO ĐÂY:
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    otp_code:                { type: String, default: null },
    otp_expires_at:          { type: Date, default: null },
    is_active:               { type: Boolean, default: true },
    reset_password_token:    { type: String, default: null },
    reset_password_expires:  { type: Date, default: null },
    fcmToken:                { type: String, default: null },
    googleId:                { type: String, default: null },
    temp_link_email:         { type: String, default: null },
    temp_link_phone:         { type: String, default: null },
    temp_link_otp:           { type: String, default: null },
    temp_link_otp_expires_at: { type: Date, default: null },
    temp_link_otp_attempts:  { type: Number, default: 0 },
    created_at:              { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// ─── Cascade Delete Hook ──────────────────────────────────────────────────────
// Automatically cleans up ALL related documents when a User is deleted.
// This prevents orphan data from accumulating in production.
// Triggered by: User.findByIdAndDelete(), User.findOneAndDelete(),
//               User.deleteOne(), User.deleteMany()
UserSchema.pre(
  ['findOneAndDelete', 'deleteOne', 'deleteMany'],
  async function () {
    try {
      // Get the filter to identify which user(s) are being deleted
      const filter = this.getFilter();

      // Dynamically require models to avoid circular dependency issues
      const UserProfile            = mongoose.model('UserProfile');
      const UserDietary            = mongoose.model('UserDietary');
      const MealPlan               = mongoose.model('MealPlan');
      const MealPlanItem           = mongoose.model('MealPlanItem');
      const Notification           = mongoose.model('Notification');
      const ConsultationContract   = mongoose.model('ConsultationContract');
      const Transaction            = mongoose.model('Transaction');

      // Find which user IDs will be deleted
      const usersToDelete = await mongoose.model('User').find(filter, '_id');
      const userIds       = usersToDelete.map((u) => u._id);

      if (userIds.length === 0) return;

      // Find contracts owned by these users (needed for cascade into messages/tx)
      const contractIds = (
        await ConsultationContract.find({ user_id: { $in: userIds } }, '_id')
      ).map((c) => c._id);

      // Find meal plan IDs for these users (needed to cascade into MealPlanItem)
      const mealPlanIds = (
        await MealPlan.find({ user_id: { $in: userIds } }, '_id')
      ).map((mp) => mp._id);

      // CustomerMealLog (optional model)
      const CustomerMealLog = mongoose.modelNames().includes('CustomerMealLog')
        ? mongoose.model('CustomerMealLog') : null;

      // Cascade delete in dependency order (leaves first)
      await Promise.all([
        // Profile & dietary
        UserProfile.deleteMany({ user_id: { $in: userIds } }),
        UserDietary.deleteMany({ user_id: { $in: userIds } }),

        // MealPlanItems first, then MealPlans
        ...(mealPlanIds.length > 0
          ? [MealPlanItem.deleteMany({ meal_plan_id: { $in: mealPlanIds } })]
          : []),
        MealPlan.deleteMany({ user_id: { $in: userIds } }),

        // Notifications
        Notification.deleteMany({ user_id: { $in: userIds } }),

        // Transactions
        Transaction.deleteMany({ user_id: { $in: userIds } }),

        // Meal logs
        ...(CustomerMealLog
          ? [CustomerMealLog.deleteMany({ user_id: { $in: userIds } })]
          : []),
      ]);

      // Contract-dependent data
      if (contractIds.length > 0) {
        const ConsultationMessage = mongoose.modelNames().includes('ConsultationMessage')
          ? mongoose.model('ConsultationMessage') : null;
        if (ConsultationMessage) {
          await ConsultationMessage.deleteMany({ contract_id: { $in: contractIds } });
        }
        await Transaction.deleteMany({ consultation_contracts_id_fk: { $in: contractIds } });
        await ConsultationContract.deleteMany({ _id: { $in: contractIds } });
      }

      return;
    } catch (err) {
      throw err;
    }
  }
);

module.exports = mongoose.model('User', UserSchema);