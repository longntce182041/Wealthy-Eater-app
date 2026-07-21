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
      meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to load user list.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'ChangeMe123!';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

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
      role: role.toLowerCase(),
      created_at: new Date(),
      status: status.toLowerCase(),
    });

    let savedUser = await newUser.save();

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
      data: { id: savedUser._id, email: savedUser.email, role: savedUser.role, status: savedUser.status },
    });
  } catch (err) {
    return next(new AppError(err.message || 'Server error while creating user.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const userId = req.params.id || req.params.userId;
    const { status } = req.body || {};

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return next(new AppError(`Định dạng ID cấu trúc không hợp lệ: ${userId}`, 400, 'VALIDATION_ERROR'));
    }

    const normalizedStatus = String(status).trim().toLowerCase();
    if (!status || !['active', 'banned', 'suspended'].includes(normalizedStatus)) {
      return next(new AppError('Trạng thái không hợp lệ. Chỉ chấp nhận active, banned hoặc suspended.', 400, 'VALIDATION_ERROR'));
    }

    const user = await User.findById(new mongoose.Types.ObjectId(userId));
    if (!user) {
      return next(new AppError(`Không tìm thấy người dùng có ID [${userId}] trên Database.`, 404, 'NOT_FOUND'));
    }

    user.status = normalizedStatus;
    await user.save();

    if (normalizedStatus === 'banned') {
      try {
        if (redisClient.status === 'ready' || redisClient.status === 'connect') {
          const keys = await redisClient.keys(`*${userId}*`);
          if (keys && keys.length > 0) await redisClient.del(keys);
        }
      } catch (redisErr) {
        console.error('⚠️ Lỗi Redis khi cố gắng xóa Token:', redisErr.message);
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

// Hàm tiện ích kiểm tra và ép kiểu ID an toàn
function toSafeObjectId(id, next) {
  if (!id) return null;
  
  // Dọn dẹp nếu có dấu hai chấm rác dính vào do lỗi Router Frontend
  let cleanId = String(id).trim();
  if (cleanId.startsWith(':')) cleanId = cleanId.slice(1);
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];

  // Kiểm tra xem có đúng cấu trúc 24 ký tự Hex của MongoDB không
  if (!mongoose.Types.ObjectId.isValid(cleanId)) {
    return null;
  }
  
  return new mongoose.Types.ObjectId(cleanId);
}

async function updateUser(req, res, next) {
  try {
    const rawId = req.params.id || req.params.userId;
    const objectId = toSafeObjectId(rawId);

    if (!objectId) {
      return next(new AppError(`Định dạng ID người dùng không hợp lệ hoặc sai cấu trúc: ${rawId}`, 400, 'VALIDATION_ERROR'));
    }

    // Tìm kiếm bằng ObjectId đã được chuẩn hóa
    const user = await User.findById(objectId);
    if (!user) {
      return next(new AppError(`Không tìm thấy người dùng có ID [${rawId}] trên hệ thống.`, 404, 'NOT_FOUND'));
    }

    let { email, role, status, password } = req.body || {};

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
      }
    }

    if (password && String(password).trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(String(password).trim(), salt);
    }

    await user.save();

    // Thu hồi token nếu bị banned
    if (user.status === 'banned') {
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
    const objectId = toSafeObjectId(rawId);

    if (!objectId) {
      return next(new AppError(`Định dạng ID không hợp lệ để thực hiện xóa: ${rawId}`, 400, 'VALIDATION_ERROR'));
    }

    // Thực hiện xóa bằng ObjectId chuẩn
    const deletedUser = await User.findByIdAndDelete(objectId);
    if (!deletedUser) {
      return next(new AppError(`Không tìm thấy người dùng có ID [${rawId}] trong Database để thực hiện xóa cứng.`, 404, 'NOT_FOUND'));
    }

    // Dọn dẹp các bảng liên quan dữ liệu gốc
    await Promise.all([
      UserProfile.deleteOne({ user_id: deletedUser._id }),
      UserDietary.deleteOne({ user_id: deletedUser._id })
    ]).catch(err => console.warn('⚠️ Gặp lỗi khi dọn dẹp profile phụ hệ thống:', err.message));

    // Xóa session đăng nhập trong Redis nếu có
    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        const keys = await redisClient.keys(`*${deletedUser._id.toString()}*`);
        if (keys && keys.length > 0) await redisClient.del(keys);
      }
    } catch (redisErr) {
      console.error('⚠️ Lỗi Redis khi dọn dẹp token user xóa:', redisErr.message);
    }

    return res.json({
      success: true,
      message: 'Đã xóa vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan khỏi cơ sở dữ liệu MongoDB thành công!'
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