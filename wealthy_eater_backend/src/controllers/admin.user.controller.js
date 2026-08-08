/**
 * Admin User Controller - UC-77: View List User & UC-79: Edit/Delete/Create User
 * System user management APIs: Fetch list, create role-based users, update profile, and manage status.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserDietary = require('../models/UserDietary');
const Nutritionist = require('../models/Nutritionist');
const AppError = require('../utils/AppError');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 0, 
  connectTimeout: 2000
});

redisClient.on('error', (err) => {
  if (redisClient.status === 'end') return;
  console.error('⚠️ [Redis Offline]: Redis service connection lost or disabled.');
  redisClient.disconnect();
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildUserFilter(query) {
  const filter = {};
  if (query.search) {
    const searchTerm = escapeRegex(String(query.search).trim());
    filter.email = { $regex: searchTerm, $options: 'i' };
  }
  if (query.role) {
    filter.role = String(query.role).trim().toLowerCase();
  }
  if (query.status) {
    filter.status = String(query.status).trim().toLowerCase();
  }
  return filter;
}

/**
 * Helper Mapper function to map User and related Profiles accurately
 */
function mapUserForAdmin(user, profile, dietary, nutritionistProfile) {
  return {
    id: user._id.toString(),  
    _id: user._id.toString(),
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    status: user.status || (user.is_active === false ? 'suspended' : 'active'),
    createdAt: user.created_at || user.createdAt || new Date(),
    profile: profile ? {
      fullName: profile.full_name || '',
      age: profile.age ?? null,
      gender: profile.gender || '',
      height: profile.height ?? null,
      weight: profile.weight ?? null,
      bmi: profile.bmi ?? null,
      tdee: profile.tdee ?? null,
      bmr: profile.bmr ?? null,
      healthGoal: profile.health_goal || '',
    } : null,
    dietary: dietary ? {
      medicalConditionId: dietary.medical_condition_id || null,
      allergies: dietary.allergies || [],
      dislikeIngredients: dietary.dislike_ingredients || [],
      cookingSkillLevel: dietary.cooking_skill_level || '',
      availableCookingTime: dietary.available_cooking_time || 0,
      activityLevel: dietary.activity_level || null,
      dietPreferences: dietary.diet_preferences || [],
    } : null,
    nutritionistProfile: nutritionistProfile ? {
      fullName: nutritionistProfile.full_name || '',
      specialization: nutritionistProfile.specialization || '',
      professionalTitle: nutritionistProfile.professional_title || '',
      licenseNumber: nutritionistProfile.license_number || '',
      certificationUrl: nutritionistProfile.certification_url || '',
      serviceFee: nutritionistProfile.service_fee || 0,
      approvalStatus: nutritionistProfile.approval_status || 'APPROVED',
      averageRating: nutritionistProfile.average_rating || 5.0
    } : null
  };
}

/**
 * 1. GET USERS LIST (WITH POPULATED PROFILES & DIETARY)
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
        message: 'No matching users found.',
        data: [],
        meta: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      });
    }

    // Convert ObjectIds/Strings for reliable profile matching
    const userIdsRaw = users.map(u => u._id.toString());
    const userObjectIds = userIdsRaw
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    
    const queryIds = [...new Set([...userIdsRaw, ...userObjectIds])];

    const [profiles, dietaries, nutritionists] = await Promise.all([
      UserProfile.find({ user_id: { $in: queryIds } }).lean(),
      UserDietary.find({ user_id: { $in: queryIds } }).lean(),
      Nutritionist.find({ user_id: { $in: queryIds } }).lean(),
    ]);

    const profileMap = {};
    profiles.forEach(p => { 
      const uid = p.user_id?.toString(); 
      if (uid) profileMap[uid] = p; 
    });

    const dietaryMap = {};
    dietaries.forEach(d => { 
      const uid = d.user_id?.toString(); 
      if (uid) dietaryMap[uid] = d; 
    });

    const nutritionistMap = {};
    nutritionists.forEach(n => {
      const uid = n.user_id?.toString();
      if (uid) nutritionistMap[uid] = n;
    });

    const data = users.map(u => {
      const uid = u._id.toString();
      return mapUserForAdmin(
        u, 
        profileMap[uid] || null, 
        dietaryMap[uid] || null, 
        nutritionistMap[uid] || null
      );
    });

    const totalPages = Math.ceil(total / limit);
    return res.json({
      success: true,
      message: 'Successfully retrieved user list!',
      data,
      meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to load user list.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'ChangeMe123!';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

/**
 * 2. CREATE USER (WITH ROLE-BASED PROFILE CREATION)
 */
async function createUser(req, res, next) {
  try {
    const { 
      email, 
      phone, 
      password, 
      role = 'customer', 
      status = 'active', 
      
      // Common UserProfile Fields
      fullName = '', 
      name = '',
      age,
      gender,
      height,
      weight,
      healthGoal = '',

      // UserDietary Fields
      activityLevel = null,
      dietPreferences = [],
      cookingSkillLevel = 'medium',
      availableCookingTime = 30,

      // Nutritionist Specific Fields
      specialization = 'General Nutrition',
      professionalTitle = 'Specialist',
      licenseNumber = '',
      certificationUrl = '',
      serviceFee = 0,
      approvalStatus = 'APPROVED'
    } = req.body || {};
    
    // Validation: Email
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
      return next(new AppError('This email is already registered in the system.', 409, 'ALREADY_REGISTERED'));
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone: String(phone).trim() }).lean();
      if (existingPhone) {
        return next(new AppError('This phone number is already registered in the system.', 409, 'ALREADY_REGISTERED'));
      }
    }

    // Password setup
    const rawPassword = password && String(password).trim().length >= 6
      ? String(password).trim()
      : DEFAULT_PASSWORD;

    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const inputFullName = (fullName || name || '').trim();
    const displayName = inputFullName || normalizedEmail.split('@')[0];
    const normalizedStatus = String(status).trim().toLowerCase();
    const targetRole = String(role).trim().toLowerCase();

    // 1. Create Base User
    const userData = {
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : undefined,
      password_hash: passwordHash,
      role: targetRole,
      status: normalizedStatus,
      is_active: normalizedStatus === 'active',
      created_at: new Date(),
    };

    const newUser = new User(userData);
    const savedUser = await newUser.save();
    const userIdStr = savedUser._id.toString();

    let createdProfile = null;
    let createdDietary = null;
    let createdNutritionist = null;

    // 2. Create UserProfile (Satisfies strict required schema fields)
    try {
      createdProfile = await UserProfile.create({
        user_id: userIdStr,
        full_name: displayName,
        age: age ? Number(age) : 25,             // Fallback for required: true
        gender: gender ? String(gender) : 'other', // Fallback for required: true
        height: height ? Number(height) : 170,    // Fallback for required: true
        weight: weight ? Number(weight) : 65,     // Fallback for required: true
        health_goal: healthGoal || 'maintain_weight'
      });
    } catch (pErr) {
      console.warn('⚠️ UserProfile creation warning:', pErr.message);
    }

    // 3. Create UserDietary
    try {
      createdDietary = await UserDietary.create({
        user_id: userIdStr,
        allergies: [],
        dislike_ingredients: [],
        cooking_skill_level: cookingSkillLevel || 'medium',
        available_cooking_time: Number(availableCookingTime) || 30,
        activity_level: activityLevel || null,
        diet_preferences: Array.isArray(dietPreferences) ? dietPreferences : []
      });
    } catch (dErr) {
      console.warn('⚠️ UserDietary creation warning:', dErr.message);
    }

    // 4. Create Nutritionist Profile if Role === 'nutritionist'
    if (targetRole === 'nutritionist') {
      try {
        createdNutritionist = await Nutritionist.create({
          user_id: userIdStr,
          full_name: displayName,
          specialization: specialization || 'General Nutrition',
          professional_title: professionalTitle || 'Specialist',
          license_number: licenseNumber || '',
          certification_url: certificationUrl || '',
          service_fee: Number(serviceFee) || 0,
          approval_status: approvalStatus || 'APPROVED'
        });
      } catch (nErr) {
        console.warn('⚠️ Nutritionist Profile creation warning:', nErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Successfully created ${targetRole.toUpperCase()} account!`,
      data: mapUserForAdmin(savedUser, createdProfile, createdDietary, createdNutritionist),
    });
  } catch (err) {
    console.error('💥 Error in createUser:', err);
    return next(new AppError(err.message || 'System error occurred while creating user.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

function toSafeId(id) {
  if (!id) return null;
  let cleanId = String(id).trim();
  if (cleanId.startsWith(':')) cleanId = cleanId.slice(1);
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
  return cleanId;
}

/**
 * 3. UPDATE USER STATUS
 */
async function updateUserStatus(req, res, next) {
  try {
    const rawId = req.params.id || req.params.userId;
    const cleanId = toSafeId(rawId);

    if (!cleanId) {
      return next(new AppError(`Invalid user ID format: ${rawId}`, 400, 'VALIDATION_ERROR'));
    }

    const { status } = req.body || {};
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!status || !['active', 'banned', 'suspended'].includes(normalizedStatus)) {
      return next(new AppError('Invalid status. Only "active", "banned", or "suspended" are allowed.', 400, 'VALIDATION_ERROR'));
    }

    const user = await User.findById(cleanId);
    if (!user) {
      return next(new AppError(`User with ID [${rawId}] was not found in database.`, 404, 'NOT_FOUND'));
    }

    user.status = normalizedStatus;
    user.is_active = normalizedStatus === 'active';
    await user.save();

    if (normalizedStatus === 'banned' || normalizedStatus === 'suspended') {
      try {
        if (redisClient.status === 'ready' || redisClient.status === 'connect') {
          const keys = await redisClient.keys(`*${cleanId}*`);
          if (keys && keys.length > 0) await redisClient.del(keys);
        }
      } catch (redisErr) {
        console.error('⚠️ Redis error when revoking user tokens:', redisErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Successfully updated user status!',
      data: { id: user._id.toString(), email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    return next(new AppError(err.message || 'System error occurred while updating status.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

/**
 * 4. UPDATE USER INFORMATION & PROFILE
 */
async function updateUser(req, res, next) {
  try {
    const rawId = req.params.id || req.params.userId;
    const cleanId = toSafeId(rawId);

    if (!cleanId) {
      return next(new AppError(`Invalid user ID structure: ${rawId}`, 400, 'VALIDATION_ERROR'));
    }

    const user = await User.findById(cleanId);
    if (!user) {
      return next(new AppError(`User with ID [${rawId}] was not found in system.`, 404, 'NOT_FOUND'));
    }

    let { email, role, status, password, fullName, age, gender, height, weight, healthGoal } = req.body || {};

    // Update User core fields
    if (email && typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email.toLowerCase()) {
        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).lean();
        if (existing) {
          return next(new AppError('This email is already in use by another account.', 409, 'ALREADY_REGISTERED'));
        }
        user.email = normalizedEmail;
      }
    }

    if (role && typeof role === 'string') {
      const normalizedRole = role.trim().toLowerCase();
      if (['customer', 'nutritionist', 'admin'].includes(normalizedRole)) {
        user.role = normalizedRole;
      }
    }

    if (status && typeof status === 'string') {
      const normalizedStatus = status.trim().toLowerCase();
      if (['active', 'banned', 'suspended'].includes(normalizedStatus)) {
        user.status = normalizedStatus;
        user.is_active = normalizedStatus === 'active';
      }
    }

    if (password && String(password).trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(String(password).trim(), salt);
    }

    await user.save();

    // Synchronize UserProfile updates
    const profileUpdates = {};
    if (fullName) profileUpdates.full_name = fullName.trim();
    if (age !== undefined) profileUpdates.age = Number(age);
    if (gender !== undefined) profileUpdates.gender = String(gender);
    if (height !== undefined) profileUpdates.height = Number(height);
    if (weight !== undefined) profileUpdates.weight = Number(weight);
    if (healthGoal !== undefined) profileUpdates.health_goal = String(healthGoal);

    if (Object.keys(profileUpdates).length > 0) {
      await UserProfile.updateOne(
        { user_id: user._id.toString() },
        { $set: profileUpdates },
        { upsert: true }
      );
    }

    if (user.status === 'banned' || user.status === 'suspended') {
      try {
        if (redisClient.status === 'ready' || redisClient.status === 'connect') {
          const keys = await redisClient.keys(`*${user._id.toString()}*`);
          if (keys && keys.length > 0) await redisClient.del(keys);
        }
      } catch (redisErr) {
        console.error('⚠️ Redis error when revoking tokens:', redisErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Successfully updated user details!',
      data: { id: user._id.toString(), email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    console.error('💥 Error in updateUser:', err);
    return next(new AppError(err.message || 'System error occurred while updating user.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

/**
 * 5. DELETE USER PERMANENTLY
 */
async function deleteUser(req, res, next) {
  try {
    const rawId = req.params.id || req.params.userId;
    const cleanId = toSafeId(rawId);

    if (!cleanId) {
      return next(new AppError(`Invalid ID format for deletion: ${rawId}`, 400, 'VALIDATION_ERROR'));
    }

    const deletedUser = await User.findByIdAndDelete(cleanId);
    if (!deletedUser) {
      return next(new AppError(`User with ID [${rawId}] was not found for deletion.`, 404, 'NOT_FOUND'));
    }

    const userIdStr = deletedUser._id.toString();

    // Clean up all user auxiliary documents
    await Promise.all([
      UserProfile.deleteOne({ user_id: userIdStr }),
      UserDietary.deleteOne({ user_id: userIdStr }),
      Nutritionist.deleteOne({ user_id: userIdStr })
    ]).catch(err => console.warn('⚠️ Error cleaning up auxiliary profiles:', err.message));

    // Clear session cache in Redis
    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        const keys = await redisClient.keys(`*${userIdStr}*`);
        if (keys && keys.length > 0) await redisClient.del(keys);
      }
    } catch (redisErr) {
      console.error('⚠️ Redis error when cleaning deleted user tokens:', redisErr.message);
    }

    return res.json({
      success: true,
      message: 'User account deleted permanently!'
    });
  } catch (err) {
    console.error('💥 Error in deleteUser:', err);
    return next(new AppError(err.message || 'Error occurred while deleting account from database.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

module.exports = {
  getUsersList,
  createUser,
  updateUser,
  updateUserStatus, 
  deleteUser         
};