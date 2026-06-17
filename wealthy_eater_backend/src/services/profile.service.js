const mongoose = require('mongoose');
const UserProfileRepo = require('../repositories/userprofile.repository');
const WeightLogRepo = require('../repositories/weightlog.repository');
const UserDietary = require('../models/UserDietary');
const Ingredient = require('../models/Ingredient');
const MedicalCondition = require('../models/MedicalCondition');
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
    if (!profile) return null;

    const dietary = await UserDietary.findOne({ user_id: userId })
      .populate('medical_condition_id')
      .populate('allergies')
      .populate('dislike_ingredients')
      .lean();

    const profileObj = profile.toObject();
    profileObj.dietary_references = {
      activity_level: dietary?.activity_level || null,
      diet_preferences: dietary?.diet_preferences || [],
      allergies: dietary?.allergies || [],
    };
    profileObj.medical_condition_id = dietary?.medical_condition_id || null;
    profileObj.dislike_ingredients = dietary?.dislike_ingredients || [];
    profileObj.cooking_skill_level = dietary?.cooking_skill_level || null;
    profileObj.available_cooking_time = dietary?.available_cooking_time || null;

    return profileObj;
  }

  static async createOrUpdate(userId, data) {
    const { 
      full_name,
      age, 
      gender, 
      height_cm, 
      weight_kg, 
      activity_level, 
      health_goal, 
      diet_preferences, 
      allergies,
      dislike_ingredients,
      medical_condition_id,
      cooking_skill_level,
      available_cooking_time
    } = data;

    if (!full_name || !age || !gender || !height_cm || !weight_kg) {
      throw new AppError('full_name, age, gender, height_cm and weight_kg are required', 400);
    }

    const bmi = calculateBmi(weight_kg, height_cm);
    const bmr = calculateBmr(weight_kg, height_cm, age, gender) || null;
    const tdee = bmr ? Math.round(bmr * activityMultiplier(activity_level)) : null;

    const doc = {
      user_id: userId,
      full_name: full_name.trim(),
      age,
      gender,
      height: height_cm,
      weight: weight_kg,
      health_goal: health_goal || null,
      bmi,
      bmr,
      tdee,
    };

    const savedProfile = await UserProfileRepo.updateByUserId(userId, doc);

    const dietaryDoc = {
      user_id: userId,
      medical_condition_id: medical_condition_id || null,
      allergies: allergies || [],
      dislike_ingredients: dislike_ingredients || [],
      cooking_skill_level: cooking_skill_level || null,
      available_cooking_time: available_cooking_time || null,
      activity_level: activity_level || null,
      diet_preferences: diet_preferences || [],
    };

    const savedDietary = await UserDietary.findOneAndUpdate(
      { user_id: userId },
      dietaryDoc,
      { upsert: true, new: true }
    ).populate('medical_condition_id').populate('allergies').populate('dislike_ingredients').lean();

    const profileObj = savedProfile.toObject();
    profileObj.dietary_references = {
      activity_level: savedDietary?.activity_level || null,
      diet_preferences: savedDietary?.diet_preferences || [],
      allergies: savedDietary?.allergies || [],
    };
    profileObj.medical_condition_id = savedDietary?.medical_condition_id || null;
    profileObj.dislike_ingredients = savedDietary?.dislike_ingredients || [];
    profileObj.cooking_skill_level = savedDietary?.cooking_skill_level || null;
    profileObj.available_cooking_time = savedDietary?.available_cooking_time || null;

    return profileObj;
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
      
      const dietary = await UserDietary.findOne({ user_id: userId }).lean();
      const activity_level = dietary?.activity_level;

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

  static async getSetupMetadata() {
    const [ingredients, medicalConditions] = await Promise.all([
      Ingredient.find({}, 'name image_url').lean(),
      MedicalCondition.find({}).lean()
    ]);
    return { ingredients, medicalConditions };
  }
}

module.exports = ProfileService;
