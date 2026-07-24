const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transaction.controller");
const auth = require("../middlewares/auth");

// Lấy hàm verify token từ file auth.js của bạn
const protectMiddleware = auth.protect || auth.authenticateToken || auth.verifyToken;

// Middleware kiểm tra quyền Admin linh hoạt + In log debug ra Terminal
const debugAndCheckAdmin = (req, res, next) => {
  console.log("🔑 [DEBUG TRANSACTION API] User Payload từ Token:", req.user);

  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: "Chưa xác thực Token!" 
    });
  }

  // Lấy role và chuyển hết về chữ thường để so sánh (tránh lỗi hoa/thường)
  const userRole = String(req.user.role || req.user.userRole || "").toLowerCase();

  if (userRole !== "admin") {
    console.log(`❌ Từ chối truy cập: Role trong Token là '${req.user.role}', không phải 'admin'`);
    return res.status(403).json({
      success: false,
      message: `Forbidden: Yêu cầu quyền admin, nhưng tài khoản hiện tại có role là '${req.user.role}'`
    });
  }

  next();
};

router.get(
  "/",
  protectMiddleware,
  debugAndCheckAdmin,
  transactionController.getTransactionLogs
);

module.exports = router;