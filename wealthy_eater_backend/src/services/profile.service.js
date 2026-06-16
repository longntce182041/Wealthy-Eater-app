const UserProfileRepo = require('../repositories/userprofile.repository');
const WeightLogRepo = require('../repositories/weightlog.repository');
const AppError = require('../utils/AppError');

function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(2);
}

function calculateBmr(weightKg, heightCm, age, gender) {
  // Mifflin-St Jeor Equation
  if (!weightKg || !heightCm || !age || !gender) return null;
  const g = gender.toLowerCase();
  const s = g.startsWith('m') ? 5 : (g.startsWith('f') ? -161 : -78);
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

function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
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

  static async logWeight(userId, weight, timestamp) {
    if (!weight || isNaN(weight)) throw new AppError('Valid weight is required', 400);

    const logDate = timestamp ? new Date(timestamp) : new Date();

    // Enforce 7-day rate limit check
    const lastLog = await WeightLogRepo.findLatestByUserId(userId);
    if (lastLog) {
      const minInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      const timeSinceLastLog = logDate.getTime() - new Date(lastLog.date).getTime();
      if (timeSinceLastLog < minInterval) {
        const remainingMs = minInterval - timeSinceLastLog;
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        throw new AppError(`You can only update your weight once every 7 days. Please wait ${remainingDays} more day(s).`, 400);
      }
    }

    const log = await WeightLogRepo.create({
      user_id: userId,
      weight,
      date: logDate,
    });

    // Also update the weight in the user's profile and recalculate metrics if they have a profile
    const profile = await UserProfileRepo.findByUserId(userId);
    if (profile) {
      const height = profile.height;
      const age = profile.age;
      const gender = profile.gender;
      const activity_level = profile.dietary_references?.activity_level;

      const bmi = calculateBmi(weight, height);
      const bmr = calculateBmr(weight, height, age, gender) || null;
      const tdee = bmr ? Math.round(bmr * activityMultiplier(activity_level)) : null;

      await UserProfileRepo.updateByUserId(userId, {
        weight,
        bmi,
        bmr,
        tdee,
      });
    }

    return log;
  }

  static async getWeightHistory(userId) {
    const logs = await WeightLogRepo.findByUserId(userId);
    return logs.map(log => ({
      date: formatDate(log.date),
      weight: log.weight,
    }));
  }
}

module.exports = ProfileService;
