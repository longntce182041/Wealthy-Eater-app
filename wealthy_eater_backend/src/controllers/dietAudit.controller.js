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

    const auditResult = await dietAuditService.auditClientDietLogs(userId, date);

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

module.exports = {
  auditClientDietLogsEndpoint
};