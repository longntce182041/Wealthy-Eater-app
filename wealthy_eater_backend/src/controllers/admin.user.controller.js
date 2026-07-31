/**
 * Admin User Controller - UC-77: View List User & UC-79: Edit/Delete User
 * API quản lý người dùng: Xem danh sách, tạo mới, cập nhật thông tin và thu hồi token Redis.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserDietary = require('../models/UserDietary');
const AppError = require('../utils/AppError');
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 0, 
  connectTimeout: 2000
});

redisClient.on('error', (err) => {
  if (redisClient.status === 'end') return;
  console.error('⚠️ [Redis Offline]: Hệ thống tạm thời ngắt kết nối Redis do dịch vụ chưa bật.');
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

function mapUserForAdmin(user, profile, dietary) {
  return {
    id: user._id.toString(),  
    _id: user._id.toString(),
    email: user.email,
    role: user.role,
    status: user.status || (user.is_active === false ? 'suspended' : 'active'),
    createdAt: user.created_at || user.createdAt || new Date(),
    profile: profile ? {
      fullName: profile.full_name || profile.fullName || profile.name || '',
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
        meta: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      });
    }

    // Ép kiểu hỗ trợ query cả String lẫn ObjectId để tìm Profile không bị trượt
    const userIdsRaw = users.map(u => u._id.toString());
    const userObjectIds = userIdsRaw
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    
    const queryIds = [...new Set([...userIdsRaw, ...userObjectIds])];

    const [profiles, dietaries] = await Promise.all([
      UserProfile.find({ user_id: { $in: queryIds } }).lean(),
      UserDietary.find({ user_id: { $in: queryIds } }).lean(),
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

    const data = users.map(u => {
      const uid = u._id.toString();
      return mapUserForAdmin(u, profileMap[uid] || null, dietaryMap[uid] || null);
    });

    const totalPages = Math.ceil(total / limit);
    return res.json({
      success: true,
      message: 'Tải danh sách người dùng thành công!',
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
 * 🟢 ADD USER (CREATE USER) - FIXED CHÍNH XÁC
 */
async function createUser(req, res, next) {
  try {
    const { email, password, role = 'customer', status = 'active', fullName = '', name = '' } = req.body || {};
    
    if (!email || typeof email !== 'string') {
      return next(new AppError('Email là bắt buộc.', 400, 'VALIDATION_ERROR'));
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return next(new AppError('Định dạng email không hợp lệ.', 400, 'VALIDATION_ERROR'));
    }

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return next(new AppError('Email này đã được đăng ký trên hệ thống.', 409, 'ALREADY_REGISTERED'));
    }

    const rawPassword = password && String(password).trim().length >= 6
      ? String(password).trim()
      : DEFAULT_PASSWORD;

    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // Ưu tiên lấy fullName truyền lên từ modal Create User
    const inputFullName = (fullName || name || '').trim();
    const displayName = inputFullName || normalizedEmail.split('@')[0];
    const normalizedStatus = String(status).trim().toLowerCase();

    // Khởi tạo User Object
    const userData = {
      email: normalizedEmail,
      password_hash: passwordHash,
      role: String(role).toLowerCase(),
      status: normalizedStatus,
      is_active: normalizedStatus === 'active',
      created_at: new Date(),
    };

    const newUser = new User(userData);
    const savedUser = await newUser.save();

    // Tạo đồng bộ Profile & Dietary bằng await
    let createdProfile = null;
    try {
      createdProfile = await UserProfile.create({
        user_id: savedUser._id,
        full_name: displayName,
        fullName: displayName,
        name: displayName,
        age: null,
        gender: null,
        height: null,
        weight: null,
        dietary_references: { activity_level: null, diet_preferences: [], allergies: [] },
      });
    } catch (pErr) {
      console.warn('⚠️ UserProfile creation warning:', pErr.message);
    }

    try {
      await UserDietary.create({
        user_id: savedUser._id,
        allergies: [],
        dislike_ingredients: [],
      });
    } catch (dErr) {
      console.warn('⚠️ UserDietary creation warning:', dErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản người dùng mới thành công!',
      data: mapUserForAdmin(savedUser, createdProfile, null),
    });
  } catch (err) {
    console.error('💥 Error in createUser:', err);
    return next(new AppError(err.message || 'Lỗi hệ thống khi tạo người dùng.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

function toSafeId(id) {
  if (!id) return null;
  let cleanId = String(id).trim();
  if (cleanId.startsWith(':')) cleanId = cleanId.slice(1);
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
  return cleanId;
}

async function updateUserStatus(req, res, next) {
  try {
    const rawId = req.params.id || req.params.userId;
    const cleanId = toSafeId(rawId);

    if (!cleanId) {
      return next(new AppError(`Định dạng ID cấu trúc không hợp lệ: ${rawId}`, 400, 'VALIDATION_ERROR'));
    }

    const { status } = req.body || {};
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!status || !['active', 'banned', 'suspended'].includes(normalizedStatus)) {
      return next(new AppError('Trạng thái không hợp lệ. Chỉ chấp nhận active, banned hoặc suspended.', 400, 'VALIDATION_ERROR'));
    }

    const user = await User.findById(cleanId);
    if (!user) {
      return next(new AppError(`Không tìm thấy người dùng có ID [${rawId}] trên Database.`, 404, 'NOT_FOUND'));
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
        console.error('⚠️ Lỗi Redis khi xóa token:', redisErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công!',
      data: { id: user._id.toString(), email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    return next(new AppError(err.message || 'Lỗi hệ thống khi cập nhật trạng thái.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

async function updateUser(req, res, next) {
  try {
    const rawId = req.params.id || req.params.userId;
    const cleanId = toSafeId(rawId);

    if (!cleanId) {
      return next(new AppError(`Định dạng ID người dùng không hợp lệ hoặc sai cấu trúc: ${rawId}`, 400, 'VALIDATION_ERROR'));
    }

    const user = await User.findById(cleanId);
    if (!user) {
      return next(new AppError(`Không tìm thấy người dùng có ID [${rawId}] trên hệ thống.`, 404, 'NOT_FOUND'));
    }

    let { email, role, status, password, fullName } = req.body || {};

    if (email && typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email.toLowerCase()) {
        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).lean();
        if (existing) {
          return next(new AppError('Email này đã được sử dụng bởi một tài khoản khác.', 409, 'ALREADY_REGISTERED'));
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

    if (fullName && typeof fullName === 'string' && fullName.trim()) {
      await UserProfile.updateOne(
        { user_id: user._id },
        { $set: { full_name: fullName.trim(), fullName: fullName.trim(), name: fullName.trim() } },
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
        console.error('⚠️ Lỗi Redis khi xóa token:', redisErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Cập nhật thông tin thành viên thành công!',
      data: { id: user._id.toString(), email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    console.error('💥 Lỗi tại updateUser:', err);
    return next(new AppError(err.message || 'Lỗi hệ thống khi chỉnh sửa user.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

async function deleteUser(req, res, next) {
  try {
    const rawId = req.params.id || req.params.userId;
    const cleanId = toSafeId(rawId);

    if (!cleanId) {
      return next(new AppError(`Định dạng ID không hợp lệ để thực hiện xóa: ${rawId}`, 400, 'VALIDATION_ERROR'));
    }

    const deletedUser = await User.findByIdAndDelete(cleanId);
    if (!deletedUser) {
      return next(new AppError(`Không tìm thấy người dùng có ID [${rawId}] trong Database để thực hiện xóa.`, 404, 'NOT_FOUND'));
    }

    await Promise.all([
      UserProfile.deleteOne({ user_id: deletedUser._id }),
      UserDietary.deleteOne({ user_id: deletedUser._id })
    ]).catch(err => console.warn('⚠️ Lỗi dọn dẹp profile phụ:', err.message));

    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        const keys = await redisClient.keys(`*${deletedUser._id.toString()}*`);
        if (keys && keys.length > 0) await redisClient.del(keys);
      }
    } catch (redisErr) {
      console.error('⚠️ Lỗi Redis khi dọn token user bị xóa:', redisErr.message);
    }

    return res.json({
      success: true,
      message: 'Đã xóa vĩnh viễn tài khoản thành công!'
    });
  } catch (err) {
    console.error('💥 Lỗi tại deleteUser:', err);
    return next(new AppError(err.message || 'Lỗi khi xóa tài khoản khỏi DB.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

module.exports = {
  getUsersList,
  createUser,
  updateUser,
  updateUserStatus, 
  deleteUser         
};