/**
 * Admin User Controller - UC-77: View List User
 * API lấy danh sách người dùng hỗ trợ phân trang, tìm kiếm và lọc theo vai trò/trạng thái.
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserDietary = require('../models/UserDietary');
const AppError = require('../utils/AppError');

/**
 * Escape special regex characters to prevent ReDoS (Regex Injection protection).
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a MongoDB filter object from query parameters.
 * @param {object} query
 * @returns {object}
 */
function buildUserFilter(query) {
  const filter = {};

  if (query.search) {
    const searchTerm = escapeRegex(String(query.search).trim());
    filter.email = { $regex: searchTerm, $options: 'i' };
  }

  if (query.role) {
    filter.role = String(query.role).trim();
  }

  if (query.status) {
    filter.status = String(query.status).trim();
  }

  return filter;
}

/**
 * Map a user document and its related profile/dietary data into the admin response shape.
 * @param {object} user
 * @param {object|null} profile
 * @param {object|null} dietary
 * @returns {object}
 */
function mapUserForAdmin(user, profile, dietary) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    status: user.status || 'active',
    createdAt: user.created_at || user.createdAt || new Date(),
    profile: profile ? {
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      bmi: profile.bmi || null,
      tdee: profile.tdee || null,
      bmr: profile.bmr || null,
      healthGoal: profile.health_goal || profile.healthGoal || '',
      activityLevel: profile.dietary_references?.activity_level || null,
      dietPreferences: profile.dietary_references?.diet_preferences || [],
    } : null,
    dietary: dietary ? {
      medicalConditionId: dietary.medical_condition_id || null,
      allergies: dietary.allergies || [],
      dislikeIngredients: dietary.dislike_ingredients || [],
      cookingSkillLevel: dietary.cooking_skill_level || '',
      availableCookingTime: dietary.available_cooking_time || 0,
    } : null,
  };
}

/**
 * UC-77: GET /api/admin/users
 * Returns a paginated, searchable, filterable list of all users.
 *
 * P-03 fix: Always paginate — the unbounded User.find() mode has been removed
 * to prevent OOM on large datasets. Default page=1 / limit=20, capped at 200.
 */
async function getUsersList(req, res, next) {
  try {
    const filter = buildUserFilter(req.query || {});

    let sortObj = { created_at: -1 };
    const sortBy = req.query.sortBy || 'newest';
    switch (sortBy) {
      case 'email_asc':  sortObj = { email: 1 };           break;
      case 'email_desc': sortObj = { email: -1 };          break;
      case 'oldest':     sortObj = { created_at: 1 };      break;
      case 'newest':
      default:           sortObj = { created_at: -1, _id: -1 }; break;
    }

    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        message: 'Không tìm thấy người dùng nào phù hợp.',
        data: [],
        error: null,
        meta: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      });
    }

    // Resolve N+1: batch-fetch all related profile and dietary docs in two queries
    const userIds = users.map(u => u._id);
    const [profiles, dietaries] = await Promise.all([
      UserProfile.find({ user_id: { $in: userIds } }).lean(),
      UserDietary.find({ user_id: { $in: userIds } }).lean(),
    ]);

    const profileMap = {};
    profiles.forEach(p => { const uid = p.user_id?.toString(); if (uid) profileMap[uid] = p; });

    const dietaryMap = {};
    dietaries.forEach(d => { const uid = d.user_id?.toString(); if (uid) dietaryMap[uid] = d; });

    const data = users.map(u => {
      const uid = u._id.toString();
      return mapUserForAdmin(u, profileMap[uid] || null, dietaryMap[uid] || null);
    });

    const totalPages = Math.ceil(total / limit);
    return res.json({
      success: true,
      message: 'Tải danh sách người dùng thành công!',
      data,
      error: null,
      meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to load user list.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'ChangeMe123!';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

/**
 * POST /api/admin/users — Create a new user.
 */
async function createUser(req, res, next) {
  try {
    const { email, password, role = 'customer', status = 'active' } = req.body || {};

    if (!email || typeof email !== 'string') {
      return next(new AppError('Email is required.', 400, 'VALIDATION_ERROR'));
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return next(new AppError('Invalid email format.', 400, 'VALIDATION_ERROR'));
    }

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return next(new AppError('Email already exists.', 409, 'ALREADY_REGISTERED'));
    }

    const rawPassword = password && String(password).trim().length >= 6
      ? String(password).trim()
      : DEFAULT_PASSWORD;

    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const newUser = new User({
      email: normalizedEmail,
      password_hash: passwordHash,
      role,
      created_at: new Date(),
      status,
    });

    let savedUser;
    try {
      savedUser = await newUser.save();
    } catch (saveErr) {
      if (saveErr.code === 11000) {
        return next(new AppError('Email already exists.', 409, 'ALREADY_REGISTERED'));
      }
      if (saveErr.name === 'ValidationError') {
        return next(new AppError(saveErr.message, 400, 'VALIDATION_ERROR'));
      }
      throw saveErr;
    }

    // Create an empty profile for the new user; isolate errors so user creation still succeeds
    try {
      await UserProfile.create({
        user_id: savedUser._id,
        age: null,
        gender: null,
        height: null,
        weight: null,
        dietary_references: { activity_level: null, diet_preferences: [], allergies: [] },
      });
    } catch (profileErr) {
      console.warn('Warning: failed to create UserProfile for', savedUser._id, profileErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
        status: savedUser.status,
        createdAt: savedUser.created_at,
      },
      error: null,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Server error while creating user.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

module.exports = {
  getUsersList,
  createUser,
};