/**
 * biometricAudit.controller.js
 * HTTP layer for UC-50 — Nutritionist reviews a client's body metric history.
 *
 * All business logic is delegated to biometricAudit.service.js.
 * Errors propagate to the global Express error handler via next().
 */

const biometricAuditService = require('../services/biometricAudit.service');
const AppError               = require('../utils/AppError');

class BiometricAuditController {
  /**
   * GET /api/v1/nutritionists/audit-biometrics/:clientId
   *
   * Requires:
   *   - Valid JWT with role = 'nutritionist' (enforced in route)
   *   - :clientId must be a valid MongoDB ObjectId (enforced in route)
   *
   * Responds with the system-standard envelope:
   *   { success: true, data: WeightLog[], error: null }
   */
  async getClientBiometricHistory(req, res, next) {
    try {
      const nutritionistId = req.user.id || req.user.sub;
      if (!nutritionistId) {
        return next(new AppError('User not authenticated.', 401, 'UNAUTHORIZED'));
      }

      const { clientId } = req.params;

      const logs = await biometricAuditService.getClientBiometricHistory(
        nutritionistId,
        clientId,
      );

      return res.status(200).json({
        success: true,
        data:    logs,
        error:   null,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new BiometricAuditController();
