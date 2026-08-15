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
const UserProfile          = require('../models/UserProfile');
const UserDietary          = require('../models/UserDietary');
const MedicalCondition     = require('../models/MedicalCondition');
const { getUserMedicalCondition } = require('../utils/medicalCondition.helper');
const AppError             = require('../utils/AppError');

class BiometricAuditService {
  /**
   * Returns the full ascending weight-log history for a client,
   * after verifying the calling nutritionist holds an active contract.
   * Also returns UserProfile, UserDietary and MedicalCondition for the header card.
   *
   * @param {string} nutritionistUserId - ID of the authenticated nutritionist (req.user.id, which is User._id)
   * @param {string} clientId           - MongoDB ObjectId of the target client (:clientId param)
   * @returns {Promise<Object>} { logs, profile, dietary }
   */
  async getClientBiometricHistory(nutritionistUserId, clientId) {
    // ── Step 1: BR-21 Contract Guardrail ──────────────────────────────────────
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

    // ── Step 3: Fetch UserProfile, UserDietary and MedicalCondition ──────────
    const [profile, dietary] = await Promise.all([
      UserProfile.findOne({ user_id: clientId })
        .select('full_name avatar_url age gender height weight health_goal bmi tdee bmr')
        .lean(),
      UserDietary.findOne({ user_id: clientId })
        .select('cooking_skill_level activity_level diet_preferences allergies dislike_ingredients available_cooking_time medical_condition_id medical_condition_ids medical_condition')
        .lean(),
    ]);

    let medicalCondition = null;
    const condId = getUserMedicalCondition(dietary);
    if (condId) {
      medicalCondition = await MedicalCondition.findById(condId).lean();
    }

    // Step 4: Return combined payload with medical condition details
    return {
      logs,       // [] is a valid, successful response
      profile: profile || null,
      dietary: dietary ? {
        ...dietary,
        medical_condition: medicalCondition ? {
          _id: medicalCondition._id,
          name: medicalCondition.name,
          category: medicalCondition.category,
          description: medicalCondition.description,
          dietary_guideline: medicalCondition.dietary_guideline,
          excluded_ingredient_tags: medicalCondition.excluded_ingredient_tags || [],
          nutrient_constraints: medicalCondition.nutrient_constraints || {},
        } : null,
      } : null,
    };
  }
}

module.exports = new BiometricAuditService();
