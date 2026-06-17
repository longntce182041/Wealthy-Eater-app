const bcrypt = require('bcryptjs');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserDietary = require('../models/UserDietary');

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'ChangeMe123!';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildUserFilter(query) {
  const filter = {};
  if (query.search) {
    const searchTerm = escapeRegex(String(query.search).trim());
    filter.email = { $regex: searchTerm, $options: 'i' };
  }
  if (query.role) filter.role = String(query.role).trim();
  if (query.status) filter.status = String(query.status).trim();
  return filter;
}

function mapUserForAdmin(user, profile, dietary) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    status: user.status || 'active',
    createdAt: user.created_at || new Date(),
    profile: profile ? {
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      bmi: profile.bmi || null,
      tdee: profile.tdee || null,
      bmr: profile.bmr || null,
      healthGoal: profile.health_goal || '',
      activityLevel: profile.dietary_references?.activity_level || null,
      dietPreferences: profile.dietary_references?.diet_preferences || []
    } : null,
    dietary: dietary ? {
      medicalConditionId: dietary.medical_condition_id || null,
      allergies: dietary.allergies || [],
      dislikeIngredients: dietary.dislike_ingredients || [],
      cookingSkillLevel: dietary.cooking_skill_level || '',
      availableCookingTime: dietary.available_cooking_time || 0
    } : null
  };
}

class AdminUserService {
  async getPaginatedUsers(query) {
    const filter = buildUserFilter(query || {});
    
    let sortObj = { created_at: -1 };
    const sortBy = query.sortBy || 'newest';
    switch (sortBy) {
      case 'email_asc': sortObj = { email: 1 }; break;
      case 'email_desc': sortObj = { email: -1 }; break;
      case 'oldest': sortObj = { created_at: 1 }; break;
      case 'newest':
      default: sortObj = { created_at: -1 }; break;
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      User.countDocuments(filter)
    ]);

    if (users.length === 0) {
      return { data: [], meta: { page, limit, total, totalPages: 0, hasNextPage: false, hasPrevPage: false } };
    }

    const userIds = users.map(user => user._id);
    const [profiles, dietaries] = await Promise.all([
      UserProfile.find({ user_id: { $in: userIds } }).lean(),
      UserDietary.find({ user_id: { $in: userIds } }).lean()
    ]);

    const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
    const dietaryMap = Object.fromEntries(dietaries.map(d => [d.user_id, d]));

    const data = users.map(user => mapUserForAdmin(user, profileMap[user._id], dietaryMap[user._id]));

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  async createUser(userData) {
    const { email, password, role = 'customer', status = 'active' } = userData;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      const err = new Error('Email already exists.');
      err.code = 409;
      throw err;
    }

    const rawPassword = password && password.trim().length >= 6 ? password.trim() : DEFAULT_PASSWORD;
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const newUser = new User({
      email: normalizedEmail,
      password_hash: passwordHash,
      role,
      created_at: new Date(),
      status
    });

    let savedUser;
    try {
      savedUser = await newUser.save();
    } catch (saveErr) {
      if (saveErr.code === 11000) {
        const err = new Error('Email already exists.');
        err.code = 409;
        throw err;
      }
      throw saveErr;
    }

    try {
      await UserProfile.create({
        user_id: savedUser._id,
        dietary_references: { activity_level: null, diet_preferences: [], allergies: [] }
      });
    } catch (profileErr) {
      console.error('Warning: failed to create UserProfile for', savedUser._id, profileErr);
    }

    return {
      id: savedUser._id,
      email: savedUser.email,
      role: savedUser.role,
      status: savedUser.status,
      createdAt: savedUser.created_at
    };
  }
}

module.exports = new AdminUserService();
