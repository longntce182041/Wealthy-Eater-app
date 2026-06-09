/**
 * Admin User Controller - UC-77: View List User
 * API lấy danh sách người dùng hỗ trợ phân trang dữ liệu nâng cao, tìm kiếm và lọc theo vai trò/trạng thái
 */
console.log('Loaded admin.user.controller');

const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserDietary = require('../models/UserDietary');

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
  // Lưu ý: Trường này sẽ hoạt động khi bạn cập nhật thêm trường 'status' vào UserSchema của mình
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
    createdAt: user.created_at || new Date(),
    // Thông tin bổ sung từ bảng UserProfile
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
 * Lấy danh sách người dùng phân trang và lọc nâng cao
 * * Query Parameters:
 * - page: Số trang hiện tại (Mặc định: 1)
 * - limit: Số lượng bản ghi trên một trang (Mặc định: 10, Tối đa: 100)
 * - search: Từ khóa tìm kiếm theo email người dùng
 * - role: Bộ lọc theo vai trò ('customer', 'admin', 'nutritionist')
 * - status: Bộ lọc theo trạng thái tài khoản ('active', 'blocked')
 * - sortBy: Tiêu chí sắp xếp ('newest', 'oldest', 'email_asc', 'email_desc')
 */
async function getUsersList(req, res) {
  try {
    // 1. Xây dựng bộ lọc tìm kiếm dữ liệu từ query params
    const filter = buildUserFilter(req.query || {});

    // 2. Thiết lập tiêu chí sắp xếp dữ liệu (Sử dụng trường created_at trong cấu trúc Model của bạn)
    let sortObj = { created_at: -1 }; // Mặc định: Tài khoản mới tạo lên đầu
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
        sortObj = { created_at: -1 };
        break;
    }

    // 3. Xử lý thuật toán Phân trang an toàn
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    // 4. Thực thi song song: Đếm tổng số bản ghi và truy vấn tập dữ liệu phân trang (O(1) database trip)
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    // Trường hợp không tìm thấy người dùng nào thỏa mãn bộ lọc
    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'Không tìm thấy người dùng nào phù hợp.',
        data: [],
        meta: {
          page,
          limit,
          total,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // 5. Giải quyết bài toán N+1: Thu thập tất cả user_id của trang hiện tại để gom cụm truy vấn 1 lần duy nhất
    const userIds = users.map(user => user._id);

    // Truy vấn hàng loạt dữ liệu Hồ sơ (Profile) và Chế độ ăn (Dietary) của danh sách người dùng tương ứng
    const [profiles, dietaries] = await Promise.all([
      UserProfile.find({ user_id: { $in: userIds } }).lean(),
      UserDietary.find({ user_id: { $in: userIds } }).lean()
    ]);

    // Tạo bản đồ ánh xạ nhanh (Lookup Maps) bằng Object Key để tăng tốc độ gộp dữ liệu xuống độ phức tạp O(1)
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.user_id] = p;
    });

    const dietaryMap = {};
    dietaries.forEach(d => {
      dietaryMap[d.user_id] = d;
    });

    // 6. Gộp dữ liệu hoàn chỉnh từ 3 bảng thông qua hàm Helper
    const data = users.map(user => 
      mapUserForAdmin(
        user,
        profileMap[user._id] || null,
        dietaryMap[user._id] || null
      )
    );

    // Tính toán siêu dữ liệu phân trang (Meta Pagination)
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // 7. Trả kết quả định dạng chuẩn JSON về Client
    return res.json({
      success: true,
      message: 'Tải danh sách người dùng thành công!',
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
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

module.exports = {
  getUsersList
};