/**
   * Admin User Controller - UC-77: View List User
   * API lấy danh sách người dùng hỗ trợ phân trang dữ liệu nâng cao, tìm kiếm và lọc theo vai trò/trạng thái
   */
  console.log('Loaded admin.user.controller');

  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  const UserProfile = require('../models/UserProfile');
  const UserDietary = require('../models/UserDietary');
const AppError = require('../utils/AppError');
  /**
   * Escapa caracteres especiais para regex seguro (Hàm helper bảo vệ hệ thống khỏi Regex Injection)
   */
  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Constrói filtro MongoDB baseado em query parameters
   */
  function buildUserFilter(query) {
    const filter = {};

    // Tìm kiếm theo từ khóa (khớp một phần Email, không phân biệt hoa thường)
    if (query.search) {
      const searchTerm = escapeRegex(String(query.search).trim());
      filter.email = { $regex: searchTerm, $options: 'i' };
    }

    // Lọc nhanh theo Vai trò (customer, admin, nutritionist)
    if (query.role) {
      filter.role = String(query.role).trim();
    }

    // Lọc hiển thị nhanh theo Trạng thái tài khoản (active, blocked, v.v.)
    if (query.status) {
      filter.status = String(query.status).trim();
    }

    return filter;
  }

  /**
   * Helper: Mapeia dữ liệu tổng hợp của một người dùng để trả về phía giao diện Admin Dashboard
   */
  function mapUserForAdmin(user, profile, dietary) {
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      status: user.status || 'active', // Trả về mặc định nếu schema chưa cập nhật trường này
      createdAt: user.created_at || user.createdAt || new Date(),
      // Thông tin bổ sung từ bảng UserProfile
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
        dietPreferences: profile.dietary_references?.diet_preferences || []
      } : null,
      // Thông tin bổ sung từ bảng UserDietary
      dietary: dietary ? {
        medicalConditionId: dietary.medical_condition_id || null,
        allergies: dietary.allergies || [],
        dislikeIngredients: dietary.dislike_ingredients || [],
        cookingSkillLevel: dietary.cooking_skill_level || '',
        availableCookingTime: dietary.available_cooking_time || 0
      } : null
    };
  }

  /**
   * UC-77: GET /api/admin/users
   * Lấy danh sách người dùng linh hoạt (Hỗ trợ cả trả về All mảng phẳng như Recipes HOẶC Phân trang)
   */
  async function getUsersList(req, res) {
    try {
      // 1. Xây dựng bộ lọc tìm kiếm dữ liệu từ query params
      const filter = buildUserFilter(req.query || {});

      // 2. Thiết lập tiêu chí sắp xếp dữ liệu
      let sortObj = { created_at: -1 }; 
      const sortBy = req.query.sortBy || 'newest';

      switch (sortBy) {
        case 'email_asc':
          sortObj = { email: 1 };
          break;
        case 'email_desc':
          sortObj = { email: -1 };
          break;
        case 'oldest':
          sortObj = { created_at: 1 };
          break;
        case 'newest':
        default:
          sortObj = { created_at: -1, _id: -1 };
          break;
      }

      // 💥 ĐIỂM CẢI TIẾN ĐỒNG BỘ: Kiểm tra xem Frontend có thực sự muốn phân trang hay không
      // Nếu Frontend gọi API dạng thuần không truyền page (giống Recipes), ta trả ra toàn bộ danh sách
      const isPaginationRequested = !!(req.query.page || req.query.limit);

      let users = [];
      let total = 0;

      if (isPaginationRequested) {
        // Nếu có yêu cầu phân trang -> Thực hiện thuật toán phân trang
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const [fetchedUsers, fetchedTotal] = await Promise.all([
          User.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
          User.countDocuments(filter)
        ]);
        users = fetchedUsers;
        total = fetchedTotal;
      } else {
        // 🚀 CHẾ ĐỘ GIỐNG RECIPES: Lấy toàn bộ không giới hạn để Frontend tự đếm và tự lọc
        users = await User.find(filter).sort(sortObj).lean();
        total = users.length;
      }

      // ĐỒNG BỘ CẤU TRÚC: Dù mảng trống vẫn trả về đúng form chuẩn chỉnh, không làm hỏng hàm bóc tách data ở React
      if (!users || users.length === 0) {
        return res.json({
          success: true,
          message: 'Không tìm thấy người dùng nào phù hợp.',
          data: [],
          meta: { total: 0, page: 1, totalPages: 0 }
        });
      }

      // 3. Giải quyết bài toán N+1: Gom cụm IDs để truy vấn Profile & Dietary 1 lần duy nhất
      const userIds = users.map(u => u._id);

      const [profiles, dietaries] = await Promise.all([
        UserProfile.find({ user_id: { $in: userIds } }).lean(),
        UserDietary.find({ user_id: { $in: userIds } }).lean()
      ]);

      // Tạo bản đồ ánh xạ nhanh O(1) để tối ưu hiệu năng gộp dữ liệu
      const profileMap = {};
      profiles.forEach(p => {
        const uid = p.user_id ? p.user_id.toString() : '';
        if (uid) profileMap[uid] = p;
      });

      const dietaryMap = {};
      dietaries.forEach(d => {
        const uid = d.user_id ? d.user_id.toString() : '';
        if (uid) dietaryMap[uid] = d;
      });

      // 4. Gộp dữ liệu thông qua hàm Helper ánh xạ an toàn
      const data = users.map(u => {
        const uidStr = u._id.toString();
        return mapUserForAdmin(
          u,
          profileMap[uidStr] || null,
          dietaryMap[uidStr] || null
        );
      });

      // 5. Trả kết quả về với cấu trúc bao bọc data chuẩn chỉnh
      const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(req.query.limit, 10) || total, 1);
      const totalPages = Math.ceil(total / limitNum);

      return res.json({
        success: true,
        message: 'Tải danh sách người dùng thành công!',
        data: data, // Đảm bảo luôn nằm trong .data giống hệt cấu trúc của Recipes!
        meta: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      });

    } catch (err) {
      console.error('❌ Error fetching admin users list:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Xảy ra lỗi hệ thống khi tải danh sách người dùng.'
      });
    }
  }

  const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'ChangeMe123!';
  const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

  async function createUser(req, res) {
    try {
      console.log('createUser called');
      console.log('req.body:', req.body);

      const { email, password, role = 'customer', status = 'active' } = req.body || {};

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: 'Email is required.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
      }

      // Double-check DB connection
      if (!User.db || !User.db.readyState) {
        console.error('MongoDB not connected or readyState:', User.db && User.db.readyState);
        return res.status(500).json({ success: false, message: 'Database not ready.' });
      }

      // Check duplicate
      const existing = await User.findOne({ email: normalizedEmail }).lean();
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already exists.' });
      }

      const rawPassword = password && String(password).trim().length >= 6 ? String(password).trim() : DEFAULT_PASSWORD;

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
        console.error('Error saving user:', saveErr);
        if (saveErr.code === 11000) {
          return res.status(409).json({ success: false, message: 'Email already exists.' });
        }
        if (saveErr.name === 'ValidationError') {
          return res.status(400).json({ success: false, message: saveErr.message });
        }
        throw saveErr;
      }

      // Create profile but isolate errors so user creation still succeeds
      try {
        await UserProfile.create({
          user_id: savedUser._id,
          age: null,
          gender: null,
          height: null,
          weight: null,
          dietary_references: { activity_level: null, diet_preferences: [], allergies: [] }
        });
      } catch (profileErr) {
        console.error('Warning: failed to create UserProfile for', savedUser._id, profileErr);
      }

      return res.status(201).json({
        success: true,
        message: 'User created successfully.',
        data: {
          id: savedUser._id,
          email: savedUser.email,
          role: savedUser.role,
          status: savedUser.status,
          createdAt: savedUser.created_at
        }
      });

    } catch (err) {
      console.error('❌ Error creating user full stack:', err);
      return res.status(500).json({ success: false, message: 'Server error while creating user.' });
    }
  }

  module.exports = {
    getUsersList,
    createUser
  };