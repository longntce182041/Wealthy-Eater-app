const { verifyAccessToken } = require("../utils/jwt");

/**
 * Middleware: verify JWT access token from Authorization: Bearer <token> header.
 * Attaches decoded payload to `req.user` on success.
 */
const authenticateToken = (req, res, next) => {
  // Bắt cả 'authorization' lẫn 'Authorization' để đề phòng Header bị viết hoa
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7) // remove 'Bearer ' prefix
      : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token not provided.",
    });
  }

  try {
    const payload = verifyAccessToken(token);

    // 🟢 LẤY ROLE MỘT CÁCH AN TOÀN (Bắt mọi dạng đặt tên role trong Payload)
    const rawRole =
      payload.role ||
      payload.roles ||
      payload.userRole ||
      payload.user_role ||
      "";

    // Ép kiểu role về dạng mảng chuỗi chữ THƯỜNG để dễ so sánh
    const parsedRoles = Array.isArray(rawRole)
      ? rawRole.map((r) => String(r).toLowerCase())
      : [String(rawRole).toLowerCase()];

    req.user = {
      ...payload,
      id: payload.id || payload.sub || payload.userId,
      role: parsedRoles[0] || "", // Trường role chính dạng chữ thường (vd: 'admin')
      roles: parsedRoles,         // Danh sách roles dạng mảng
    };

    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: isExpired
        ? "Access token has expired."
        : "Invalid access token.",
    });
  }
};

/**
 * Middleware: check that `req.user.role` is in the list of permitted roles.
 * Must be used AFTER `authenticateToken`.
 */
const authorizeRoles = (...permittedRoles) => {
  // Chuyển tất cả các role truyền vào thành chữ THƯỜNG để so sánh an toàn
  const normalizedPermittedRoles = permittedRoles.map((role) =>
    String(role).toLowerCase()
  );

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User authentication required.",
      });
    }

    // 🟢 KIỂM TRA QUYỀN (Không phân biệt Hoa/Thường + Hỗ trợ kiểm tra Admin ưu tiên)
    const userRoles = req.user.roles || [req.user.role];
    const hasPermission = userRoles.some((uRole) =>
      normalizedPermittedRoles.includes(uRole)
    );

    // Nếu người dùng có cờ isAdmin = true thì cho qua luôn
    if (hasPermission || req.user.isAdmin === true) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action.",
    });
  };
};

module.exports = { authenticateToken, authorizeRoles };