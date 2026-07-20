/**
 * biometricAudit.service.js
 * Handles UC-50 — Review Body Metrics by a Nutritionist.
 *
 * Business Rule BR-21 (Security Guardrail):
 *   A nutritionist may only view a client's biometric history if an
 *   active consultation contract exists between them. Any other access
 *   attempt is rejected with HTTP 403 Forbidden.
 */

const ConsultationContract = require('../models/ConsultationContract');
const WeightLogRepository  = require('../repositories/weightlog.repository');
const Nutritionist         = require('../models/Nutritionist');
const AppError             = require('../utils/AppError');

class BiometricAuditService {
  /**
   * Returns the full ascending weight-log history for a client,
   * after verifying the calling nutritionist holds an active contract.
   *
   * @param {string} nutritionistUserId - ID of the authenticated nutritionist (req.user.id, which is User._id)
   * @param {string} clientId           - MongoDB ObjectId of the target client (:clientId param)
   * @returns {Promise<WeightLog[]>} Sorted array (oldest → newest), may be empty.
   */
  async getClientBiometricHistory(nutritionistUserId, clientId) {
    // ── Step 1: BR-21 Contract Guardrail ──────────────────────────────────────
    // The nutritionistUserId from the token is User._id. We need Nutritionist._id.
    const nutritionistProfile = await Nutritionist.findOne({ user_id: nutritionistUserId }).lean();
    if (!nutritionistProfile) {
      throw new AppError(
        'Nutritionist profile not found.',
        404,
        'NOT_FOUND',
      );
    }

    const activeContract = await ConsultationContract.findOne({
      nutritionist_id: nutritionistProfile._id,
      user_id:         clientId,
      status:          'active',
    }).lean();

    if (!activeContract) {
      throw new AppError(
        'Forbidden: You do not have an active consultation contract with this client.',
        403,
        'NO_ACTIVE_CONTRACT',
      );
    }

    // ── Step 2: Fetch weight logs (ascending — oldest first for chart rendering) ─
    const logs = await WeightLogRepository.findByUserIdAsc(clientId);

    // Step 3: Return empty array (200 OK) when client has no logs yet
    // (do NOT throw 404 — lets the UI render an empty placeholder state)
    return logs; // [] is a valid, successful response
  }
}

module.exports = new BiometricAuditService();
