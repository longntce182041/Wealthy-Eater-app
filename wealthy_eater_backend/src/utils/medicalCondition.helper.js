/**
 * medicalCondition.helper.js
 *
 * Helper functions for reading medical condition data from UserDietary.
 *
 * WHY THIS HELPER EXISTS:
 * Currently `UserDietary.medical_condition_id` stores a single String value.
 * In the future, this may be migrated to `medical_condition_ids: [String]`
 * to support multiple conditions per user. By routing ALL reads through this
 * helper, we ensure only ONE place needs to change when that migration happens.
 *
 * Usage:
 *   const { getUserMedicalCondition, getUserMedicalConditions } = require('./medicalCondition.helper');
 *   const condId = getUserMedicalCondition(dietary);    // null | String
 *   const condIds = getUserMedicalConditions(dietary);  // always String[]
 */

'use strict';

function _extractId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val._id ? val._id.toString() : val.toString();
  }
  return String(val);
}

/**
 * Returns the single medical condition ID for a user, or null if none.
 * Supports both legacy `medical_condition_id` (String) and future
 * `medical_condition_ids` (Array) fields.
 *
 * @param {Object|null} userDietary — the UserDietary document (lean or mongoose)
 * @returns {string|null}
 */
function getUserMedicalCondition(userDietary) {
  if (!userDietary) return null;

  if (Array.isArray(userDietary.medical_condition_ids) && userDietary.medical_condition_ids.length > 0) {
    return _extractId(userDietary.medical_condition_ids[0]);
  }

  if (userDietary.medical_condition_id) {
    return _extractId(userDietary.medical_condition_id);
  }

  if (userDietary.medical_condition) {
    return _extractId(userDietary.medical_condition);
  }

  return null;
}

/**
 * Always returns an array of condition IDs (empty if none).
 * Safe to use in any context that expects an iterable.
 *
 * @param {Object|null} userDietary
 * @returns {string[]}
 */
function getUserMedicalConditions(userDietary) {
  if (!userDietary) return [];

  if (Array.isArray(userDietary.medical_condition_ids) && userDietary.medical_condition_ids.length > 0) {
    return userDietary.medical_condition_ids.map(_extractId).filter(Boolean);
  }

  if (userDietary.medical_condition_id) {
    const id = _extractId(userDietary.medical_condition_id);
    return id ? [id] : [];
  }

  if (userDietary.medical_condition) {
    const id = _extractId(userDietary.medical_condition);
    return id ? [id] : [];
  }

  return [];
}

module.exports = { getUserMedicalCondition, getUserMedicalConditions };

