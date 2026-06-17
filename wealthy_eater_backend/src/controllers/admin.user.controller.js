const AppError = require('../utils/AppError');
const adminUserService = require('../services/admin.user.service');

async function getUsersList(req, res, next) {
  try {
    const result = await adminUserService.getPaginatedUsers(req.query);
    
    if (result.data.length === 0) {
      return res.json({
        success: true,
        message: 'Không tìm thấy người dùng nào phù hợp.',
        data: [],
        meta: result.meta
      });
    }

    return res.json({
      success: true,
      message: 'Tải danh sách người dùng thành công!',
      data: result.data,
      meta: result.meta
    });

  } catch (err) {
    console.error('❌ Error fetching admin users list:', err);
    return next(new AppError(err.message || 'Xảy ra lỗi hệ thống khi tải danh sách người dùng.', 500));
  }
}

async function createUser(req, res, next) {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string') {
      return next(new AppError('Email is required.', 400));
    }
    
    const normalizedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return next(new AppError('Invalid email format.', 400));
    }

    const savedUser = await adminUserService.createUser(req.body);

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: savedUser
    });

  } catch (err) {
    console.error('❌ Error creating user full stack:', err);
    // Standardize error handling from service layer
    if (err.code === 409) {
      return next(new AppError(err.message, 409));
    }
    if (err.name === 'ValidationError') {
      return next(new AppError(err.message, 400));
    }
    return next(new AppError('Server error while creating user.', 500));
  }
}

module.exports = {
  getUsersList,
  createUser
};