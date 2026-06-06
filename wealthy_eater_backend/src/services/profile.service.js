const UserProfileRepo = require('../repositories/userprofile.repository');
const AppError = require('../utils/AppError');

function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(2);
}

function calculateBmr(weightKg, heightCm, age, gender) {
  // Mifflin-St Jeor Equation
  if (!weightKg || !heightCm || !age || !gender) return null;
  const s = gender.toLowerCase().startsWith('m') ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + s;
  return Math.round(bmr);
}

function activityMultiplier(level) {
  const map = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return map[level] || 1.2;
}

class ProfileService {
  static async getProfile(userId) {
    const profile = await UserProfileRepo.findByUserId(userId);
    // If profile doesn't exist yet, return null so controller can respond
    // with an empty payload (200) allowing the client to direct user to
    // the profile creation flow without treating it as an error.
    return profile || null;
  }

  static async createOrUpdate(userId, data) {
    const { age, gender, height_cm, weight_kg, activity_level, health_goal, diet_preferences, allergies } = data;
    if (!age || !gender || !height_cm || !weight_kg) throw new AppError('age, gender, height_cm and weight_kg are required', 400);

    const bmi = calculateBmi(weight_kg, height_cm);
    const bmr = calculateBmr(weight_kg, height_cm, age, gender) || null;
    const tdee = bmr ? Math.round(bmr * activityMultiplier(activity_level)) : null;

    const doc = {
      user_id: userId,
      age,
      gender,
      height: height_cm,
      weight: weight_kg,
      health_goal: health_goal || null,
      bmi,
      bmr,
      tdee,
      dietary_references: {
        activity_level: activity_level || null,
        diet_preferences: diet_preferences || [],
        allergies: allergies || [],
      },
    };

    const saved = await UserProfileRepo.updateByUserId(userId, doc);
    return saved;
  }
}

module.exports = ProfileService;
