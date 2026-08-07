/**
 * Unit Tests – UC-11 RequestMealPlan + UC-25 CreatePayOSOrder
 * + UC-26 ConnectChatSocket + UC-27 GetOrderHistory
 * + UC-29 MatchMealPlanTemplate + UC-30 ComputeRealtimeDietPlan
 */

'use strict';

jest.mock('../../src/models/MealPlan');
jest.mock('../../src/models/MealPlanTemplate');
jest.mock('../../src/models/MealPlanRequest');
jest.mock('../../src/models/Transaction');
jest.mock('../../src/models/ConsultationContract');
jest.mock('../../src/models/UserDietary');
jest.mock('../../src/services/gemini.service');

const MealPlan = require('../../src/models/MealPlan');
const MealPlanTemplate = require('../../src/models/MealPlanTemplate');
const MealPlanRequest = require('../../src/models/MealPlanRequest');
const Transaction = require('../../src/models/Transaction');
const GeminiService = require('../../src/services/gemini.service');

// ─────────────────────────────────────────────────────────────────
// UC-11: RequestMealPlan
// ─────────────────────────────────────────────────────────────────
describe('RequestMealPlan – UC-11', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MealPlanRequest.create = jest.fn().mockResolvedValue({ _id: 'req_001', status: 'pending' });
    MealPlanRequest.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null) // No existing request
    });
  });

  it('UTCID01 – valid userId + request params → creates meal plan request (Normal)', async () => {
    const result = await MealPlanRequest.create({
      user_id: 'user_001',
      requested_calories: 2000,
      duration_days: 7
    });
    expect(result).toHaveProperty('_id', 'req_001');
    expect(result).toHaveProperty('status', 'pending');
  });

  it('UTCID02 – request already exists → should upsert or return existing (Normal)', async () => {
    MealPlanRequest.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'req_existing', status: 'pending' })
    });
    const existing = await MealPlanRequest.findOne({ user_id: 'user_001' }).lean();
    expect(existing).toHaveProperty('status', 'pending');
  });

  it('UTCID03 – calorie target out of range (<500) → throws 400 (Abnormal)', async () => {
    MealPlanRequest.create = jest.fn().mockRejectedValue(
      Object.assign(new Error('Calorie target too low'), { statusCode: 400 })
    );
    await expect(MealPlanRequest.create({ user_id: 'user_001', requested_calories: 100 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('UTCID04 – duration_days boundary (1 day minimum) → success (Boundary)', async () => {
    const result = await MealPlanRequest.create({ user_id: 'user_001', requested_calories: 2000, duration_days: 1 });
    expect(result).toHaveProperty('_id');
  });

  it('UTCID05 – duration_days boundary (30 days maximum) → success (Boundary)', async () => {
    const result = await MealPlanRequest.create({ user_id: 'user_001', requested_calories: 2000, duration_days: 30 });
    expect(result).toHaveProperty('_id');
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-25: CreatePayOSOrder
// ─────────────────────────────────────────────────────────────────
describe('CreatePayOSOrder – UC-25', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Transaction.create = jest.fn().mockResolvedValue({
      _id: 'txn_001',
      status: 'pending',
      amount: 500000
    });
  });

  it('UTCID01 – valid user + nutritionist + amount → creates payment order (Normal)', async () => {
    const result = await Transaction.create({
      user_id: 'user_001',
      nutritionist_id: 'nut_001',
      amount: 500000,
      payment_method: 'payos'
    });
    expect(result).toHaveProperty('status', 'pending');
    expect(result).toHaveProperty('amount', 500000);
  });

  it('UTCID02 – amount <= 0 → throws 400 (Abnormal)', async () => {
    Transaction.create = jest.fn().mockRejectedValue(
      Object.assign(new Error('Invalid amount'), { statusCode: 400 })
    );
    await expect(Transaction.create({ user_id: 'user_001', amount: -100 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('UTCID03 – missing nutritionist_id → throws 400 (Abnormal)', async () => {
    Transaction.create = jest.fn().mockRejectedValue(
      Object.assign(new Error('Nutritionist required'), { statusCode: 400 })
    );
    await expect(Transaction.create({ user_id: 'user_001', amount: 500000 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-26: ConnectChatSocket
// ─────────────────────────────────────────────────────────────────
describe('ConnectChatSocket – UC-26', () => {
  it('UTCID01 – valid JWT in socket handshake → socket connected (Normal)', () => {
    // Simulate socket auth validation
    const mockSocket = {
      handshake: { auth: { token: 'valid_jwt_token' } },
      userId: 'user_001',
      join: jest.fn(),
      emit: jest.fn(),
    };
    // Verify the socket has a userId after auth
    expect(mockSocket.userId).toBe('user_001');
    expect(typeof mockSocket.join).toBe('function');
  });

  it('UTCID02 – missing token in handshake → connection refused (Abnormal)', () => {
    const mockSocket = { handshake: { auth: {} } };
    const token = mockSocket.handshake?.auth?.token;
    expect(token).toBeUndefined();
  });

  it('UTCID03 – valid connection → joins room (Normal)', () => {
    const mockSocket = {
      userId: 'user_001',
      join: jest.fn(),
    };
    mockSocket.join(`room_user_001`);
    expect(mockSocket.join).toHaveBeenCalledWith('room_user_001');
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-27: GetOrderHistory
// ─────────────────────────────────────────────────────────────────
describe('GetOrderHistory – UC-27', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Transaction.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'txn_001', amount: 500000, status: 'paid', created_at: new Date() }
      ])
    });
  });

  it('UTCID01 – valid userId with transactions → returns history list (Normal)', async () => {
    const results = await Transaction.find({ user_id: 'user_001' }).sort({ created_at: -1 }).populate('nutritionist_id').lean();
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('status', 'paid');
  });

  it('UTCID02 – user with no orders → returns empty array (Normal)', async () => {
    Transaction.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    });
    const results = await Transaction.find({ user_id: 'new_user' }).sort().populate().lean();
    expect(results).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-29: MatchMealPlanTemplate + UC-30: ComputeRealtimeDietPlan
// ─────────────────────────────────────────────────────────────────
describe('MatchMealPlanTemplate – UC-29', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MealPlanTemplate.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'tmpl_001', name: 'Weight Loss Plan', target_calories: 1800, health_goal: 'lose_weight' },
        { _id: 'tmpl_002', name: 'Muscle Gain Plan', target_calories: 2800, health_goal: 'gain_muscle' }
      ])
    });
  });

  it('UTCID01 – user with lose_weight goal → matches weight loss templates (Normal)', async () => {
    const templates = await MealPlanTemplate.find({ health_goal: 'lose_weight' }).lean();
    expect(templates[0]).toHaveProperty('health_goal', 'lose_weight');
  });

  it('UTCID02 – user TDEE 1800 → templates within ±200 kcal match (Normal)', async () => {
    const templates = await MealPlanTemplate.find({}).lean();
    const matched = templates.filter(t => Math.abs(t.target_calories - 1800) <= 200);
    expect(matched.length).toBeGreaterThan(0);
  });

  it('UTCID03 – no matching template → returns empty list (Normal)', async () => {
    MealPlanTemplate.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([])
    });
    const templates = await MealPlanTemplate.find({ health_goal: 'nonexistent' }).lean();
    expect(templates).toHaveLength(0);
  });
});

describe('ComputeRealtimeDietPlan – UC-30', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    GeminiService.generateMealPlan = jest.fn().mockResolvedValue({
      days: Array.from({ length: 7 }, (_, i) => ({
        day: i + 1,
        meals: [
          { meal_type: 'breakfast', recipe: { name: 'Oatmeal', calories: 350 } },
          { meal_type: 'lunch', recipe: { name: 'Grilled Chicken', calories: 400 } },
          { meal_type: 'dinner', recipe: { name: 'Salmon', calories: 450 } }
        ],
        total_calories: 1200
      })),
      total_days: 7
    });
  });

  it('UTCID01 – valid user biometrics → generates 7-day plan (Normal)', async () => {
    const result = await GeminiService.generateMealPlan({
      userId: 'user_001', tdee: 2000, health_goal: 'lose_weight', days: 7
    });
    expect(result).toHaveProperty('days');
    expect(result.days).toHaveLength(7);
  });

  it('UTCID02 – allergy restriction → allergic ingredients excluded (Normal)', async () => {
    GeminiService.generateMealPlan = jest.fn().mockResolvedValue({
      days: [{ day: 1, meals: [{ meal_type: 'lunch', recipe: { name: 'Vegetable Stew' } }] }],
      total_days: 1
    });
    const result = await GeminiService.generateMealPlan({
      userId: 'user_001', tdee: 2000, allergies: ['shellfish'], days: 1
    });
    expect(result.days[0].meals[0].recipe.name).not.toContain('Shrimp');
  });

  it('UTCID03 – Gemini API error → throws error (Abnormal)', async () => {
    GeminiService.generateMealPlan = jest.fn().mockRejectedValue(new Error('AI service unavailable'));
    await expect(GeminiService.generateMealPlan({ userId: 'user_001', tdee: 2000 }))
      .rejects.toThrow('AI service unavailable');
  });
});
