const dietAuditService = require("../services/dietAudit.service");

const auditClientDietLogsEndpoint = async (req, res) => {
  try {
    //UC54: Audit Client Diet Logs
    // Thêm dấu ? sau req.user để nếu không có user thì nó sẽ lấy undefined chứ không crash code
    const userId = req.params.clientId || req.user?.id;
    const { date } = req.query; 

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing user authentication context."
      });
    }

    // ── UC55: EXTRACT EXPRESS APP SOCKET.IO INSTANCE ─────────────────────────────
    // Hút thực thể io toàn cục được máy chủ server.js gán sẵn vào Express app thông qua app.set('io')
    const io = req.app.get('io');

    // Truyền thực thể io vào hàm làm tham số thứ 3 để xử lý đường ống bắn tin khẩn cấp tự động
    const auditResult = await dietAuditService.auditClientDietLogs(userId, date, io);

    return res.status(200).json({
      success: true,
      message: "Customer diet audit pipeline calculations processed successfully.",
      data: auditResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ── UC55: ISSUE MANUAL DEVIATION WARNING ENDPOINT ────────────────────────────
// Tiếp nhận lệnh bấm nút trực tiếp từ giao diện quản lý của Chuyên gia / Admin để ép bắn tin alert khẩn cấp
const issueManualWarningEndpoint = async (req, res) => {
  try {
    const { flagId } = req.params;
    const { customMessage } = req.body;

    if (!flagId) {
      return res.status(400).json({
        success: false,
        error: "Missing required route parameter: flagId"
      });
    }

    // Lấy thực thể Socket.io cấp phát toàn nền tảng từ ứng dụng Express
    const io = req.app.get('io');
    const notificationResult = await dietAuditService.issueManualDeviationWarning(flagId, customMessage, io);

    return res.status(200).json({
      success: true,
      message: "Emergency deviation warning code block executed and dispatched over Socket.io network successfully.",
      data: notificationResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  auditClientDietLogsEndpoint,
  issueManualWarningEndpoint
};