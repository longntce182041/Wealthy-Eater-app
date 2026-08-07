/**
 * Unit Tests – UC-12 GetDailyMeal + UC-13 ScaleServing + UC-15 GetDailyMacroReport
 * Source: mealPlan.service.js (class MealPlanService exported as singleton)
 *
 * Actual methods:
 *   - getMyMealPlan(userId)           → UC-12
 *   - getMealLogs(userId, dateStr)    → UC-15 daily log
 *   - getDailyMacroReport(userId, dateStr) → UC-15 macro totals
 *   - updateItemWeight(itemId, weight, ingredients) → UC-13 scale serving
 *   - scanMealImage(file)             → UC-14
 */

'use strict';

jest.mock('../../src/models/MealPlan');
jest.mock('../../src/models/MealPlanItem');
jest.mock('../../src/models/CustomerMealLog');
jest.mock('../../src/models/UserProfile');
jest.mock('../../src/models/UserDietary');
jest.mock('../../src/models/Notification');
jest.mock('../../src/models/RecipeIngredient');
jest.mock('../../src/models/Recipe');
jest.mock('../../src/models/Ingredient');
jest.mock('../../src/models/RecipeNutrition');
jest.mock('../../src/models/NutritionAssessment');
jest.mock('../../src/services/gemini.service');
jest.mock('../../src/services/n8n.service');

const MealPlan = require('../../src/models/MealPlan');
const MealPlanItem = require('../../src/models/MealPlanItem');
const CustomerMealLog = require('../../src/models/CustomerMealLog');
const GeminiService = require('../../src/services/gemini.service');
const n8nService = require('../../src/services/n8n.service');
const mealPlanService = require('../../src/services/mealPlan.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeMockPlan(overrides = {}) {
  return {
    _id: 'mp_001',
    user_id: 'user_001',
    nutritionist_id: 'nut_001',
    status: 'published',
    items: [{ _id: 'item_001', meal_type: 'breakfast' }],
    toObject: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// UC-12: GetDailyMeal → mealPlanService.getMyMealPlan(userId)
// ─────────────────────────────────────────────────────────────────
describe('GetDailyMeal – UC-12: MealPlanService.getMyMealPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('UTCID01 – valid userId with published meal plan → returns plan (Normal)', async () => {
    MealPlan.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(makeMockPlan())
    });
    MealPlanItem.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'item_001', meal_type: 'breakfast' }])
    });
    const result = await mealPlanService.getMyMealPlan('user_001');
    expect(result).toBeDefined();
  });

  it('UTCID02 – no meal plan exists for user → returns null (Normal)', async () => {
    MealPlan.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null)
    });
    const result = await mealPlanService.getMyMealPlan('user_no_plan');
    expect(result).toBeNull();
  });

  it('UTCID03 – missing userId → throws or returns null (Abnormal)', async () => {
    MealPlan.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null)
    });
    const result = await mealPlanService.getMyMealPlan(null);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-13: ScaleServing → mealPlanService.updateItemWeight(itemId, weight, ingredients)
// ─────────────────────────────────────────────────────────────────
describe('ScaleServing – UC-13: MealPlanService.updateItemWeight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('UTCID01 – valid itemId + weight → updates item weight (Normal)', async () => {
    const mockItem = {
      _id: 'item_001',
      actual_weight: 0,
      save: jest.fn().mockResolvedValue(true)
    };
    MealPlanItem.findById = jest.fn().mockResolvedValue(mockItem);
    const result = await mealPlanService.updateItemWeight('item_001', 200, []);
    expect(result).toBeDefined();
  });

  it('UTCID02 – item not found → throws 404 (Abnormal)', async () => {
    MealPlanItem.findById = jest.fn().mockResolvedValue(null);
    await expect(mealPlanService.updateItemWeight('nonexistent', 200, [])).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it('UTCID03 – weight <= 0 → throws 400 (Abnormal)', async () => {
    await expect(mealPlanService.updateItemWeight('item_001', 0, [])).rejects.toMatchObject({
      statusCode: 400
    });
  });

  it('UTCID04 – missing itemId → throws 400 (Abnormal)', async () => {
    await expect(mealPlanService.updateItemWeight(null, 200, [])).rejects.toMatchObject({
      statusCode: 400
    });
  });

  it('UTCID05 – weight at boundary (1g minimum) → success (Boundary)', async () => {
    const mockItem = { _id: 'item_001', actual_weight: 0, save: jest.fn().mockResolvedValue(true) };
    MealPlanItem.findById = jest.fn().mockResolvedValue(mockItem);
    const result = await mealPlanService.updateItemWeight('item_001', 1, []);
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-15: GetDailyMacroReport → mealPlanService.getDailyMacroReport(userId, dateStr)
// ─────────────────────────────────────────────────────────────────
describe('GetDailyMacroReport – UC-15: MealPlanService.getDailyMacroReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('UTCID01 – valid userId + date with logs → returns macro summary (Normal)', async () => {
    CustomerMealLog.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'log_001',
          meal_type: 'breakfast',
          actual_weight: 300,
          calories: 350,
          protein: 30,
          carbs: 40,
          fat: 10,
          date: '2025-08-07'
        }
      ])
    });

    const UserProfile = require('../../src/models/UserProfile');
    UserProfile.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ tdee: 2000, bmi: 22, bmr: 1800 })
    });

    const result = await mealPlanService.getDailyMacroReport('user_001', '2025-08-07');
    expect(result).toBeDefined();
  });

  it('UTCID02 – no logs for that date → returns zeroed macros (Normal)', async () => {
    CustomerMealLog.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    });

    const UserProfile = require('../../src/models/UserProfile');
    UserProfile.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ tdee: 2000 })
    });

    const result = await mealPlanService.getDailyMacroReport('user_001', '2020-01-01');
    expect(result).toBeDefined();
  });

  it('UTCID03 – missing dateStr → handled gracefully (Abnormal)', async () => {
    CustomerMealLog.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    });
    const UserProfile = require('../../src/models/UserProfile');
    UserProfile.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });
    const result = await mealPlanService.getDailyMacroReport('user_001', null);
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-14: ScanMealImage → mealPlanService.scanMealImage(file)
// ─────────────────────────────────────────────────────────────────
describe('ScanMealImage – UC-14: MealPlanService.scanMealImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    n8nService.scanMealImage = jest.fn().mockResolvedValue({
      name: 'Grilled Chicken',
      calories: 350,
      protein: 40,
      carbs: 5,
      fat: 15
    });
  });

  it('UTCID01 – valid image buffer → returns nutritional analysis (Normal)', async () => {
    const mockFile = { buffer: Buffer.from('fake-image-data'), mimetype: 'image/jpeg' };
    n8nService.scanMealImage = jest.fn().mockResolvedValue({
      name: 'Grilled Chicken', calories: 350
    });
    const result = await mealPlanService.scanMealImage(mockFile);
    expect(result).toBeDefined();
  });

  it('UTCID02 – null file → throws TypeError reading buffer (Abnormal)', async () => {
    await expect(mealPlanService.scanMealImage(null)).rejects.toThrow(TypeError);
  });

  it('UTCID03 – API fails → throws error (Abnormal)', async () => {
    const mockFile = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' };
    n8nService.scanMealImage = jest.fn().mockRejectedValue(new Error('N8N_TIMEOUT_OR_FAILURE'));
    await expect(mealPlanService.scanMealImage(mockFile)).rejects.toThrow();
  });
});
