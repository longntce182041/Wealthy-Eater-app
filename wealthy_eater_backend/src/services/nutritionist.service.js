const Nutritionist = require('../models/Nutritionist');
const User = require('../models/User');

class NutritionistService {
  /**
   * Get all approved nutritionists with optional pagination or filters
   */
  async getAllApprovedNutritionists() {
    try {
      // Find nutritionists where approval_status is 'approval'
      const nutritionists = await Nutritionist.find({ approval_status: 'approval' })
        .populate('user_id', 'email') // Optionally fetch user details like email if needed
        .sort({ average_rating: -1 }); // Sort by rating descending
      
      return nutritionists;
    } catch (error) {
      console.error('Error fetching nutritionists:', error);
      throw error;
    }
  }

  /**
   * Update a nutritionist's profile details
   */
  async updateNutritionistProfile(nutritionistId, updateData) {
    try {
      const updatedNutritionist = await Nutritionist.findByIdAndUpdate(
        nutritionistId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      return updatedNutritionist;
    } catch (error) {
      console.error('Error updating nutritionist profile:', error);
      throw error;
    }
  }
}

module.exports = new NutritionistService();
