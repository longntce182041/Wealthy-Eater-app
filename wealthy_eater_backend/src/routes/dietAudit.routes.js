const express = require("express");
const router = express.Router();
const dietAuditController = require("../controllers/dietAudit.controller");
const { protect } = require("../middlewares/authMiddleware");

// Route dành cho Khách hàng cá nhân tự đối chiếu hiệu số Calo/Macro của bản thân
router.get("/my-audit-logs", dietAuditController.auditClientDietLogsEndpoint);

// Route dành cho Chuyên gia dinh dưỡng (Nutritionist) nhảy vào audit dữ liệu của một khách hàng cụ thể
router.get("/nutritionist/clients/:clientId/audit-logs", dietAuditController.auditClientDietLogsEndpoint);

// UC55: Issue Deviation Warning
// Cổng tiếp nhận lệnh ép bắn thông báo đỏ khẩn cấp của Chuyên gia sang điện thoại di động khách hàng
router.post("/flags/:flagId/issue-warning", dietAuditController.issueManualWarningEndpoint);

module.exports = router;