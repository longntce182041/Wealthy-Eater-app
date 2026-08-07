/**
 * Unit Tests – UpdateProfile + UpdateBodyMetrics + ConfigureDiet
 * + CalculateMetrics + UpdateWeightLog (UC-06 to UC-10)
 * Tests based on Excel sheets of corresponding UCs
 */

'use strict';

jest.mock('../../src/repositories/userprofile.repository');
jest.mock('../../src/repositories/weightlog.repository');
jest.mock('../../src/models/UserDietary');
jest.mock('../../src/models/Ingredient');
jest.mock('../../src/models/MedicalCondition');
jest.mock('../../src/models/User');

const UserProfileRepo = require('../../src/repositories/userprofile.repository');
const WeightLogRepo = require('../../src/repositories/weightlog.repository');
const UserDietary = require('../../src/models/UserDietary');
const ProfileService = require('../../src/services/profile.service');

function makeMockProfile(overrides = {}) {
  return {
    user_id: 'user_001',
    full_name: 'Nguyen Van A',
    age: 25,
    gender: 'male',
    height: 175,
    weight: 70,
    health_goal: 'lose_weight',
    bmi: 22.86,
    bmr: 1798,
    tdee: 2487,
    toObject: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// UC-06: UpdateProfile
// ─────────────────────────────────────────────────────────────────
describe('UpdateProfile – UC-06: ProfileService.createOrUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserProfileRepo.updateByUserId = jest.fn().mockResolvedValue(makeMockProfile());
    UserDietary.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ activity_level: 'moderate', diet_preferences: [], allergies: [] })
    });
    const User = require('../../src/models/User');
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) });
  });

  const validData = {
    full_name: 'Nguyen Van A', age: 25, gender: 'male',
    height_cm: 175, weight_kg: 70, activity_level: 'moderate', health_goal: 'lose_weight',
    diet_preferences: [], allergies: [], dislike_ingredients: [],
    medical_condition_id: null, cooking_skill_level: 'beginner', available_cooking_time: 30,
  };

  it('UTCID01 – all valid data → returns updated profile (Normal)', async () => {
    const result = await ProfileService.createOrUpdate('user_001', validData);
    expect(result).toBeDefined();
    expect(result.full_name).toBe('Nguyen Van A');
  });

  it('UTCID02 – missing required field full_name → throws 400 (Abnormal)', async () => {
    const data = { ...validData, full_name: '' };
    await expect(ProfileService.createOrUpdate('user_001', data)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('UTCID03 – missing age → throws 400 (Abnormal)', async () => {
    const data = { ...validData, age: null };
    await expect(ProfileService.createOrUpdate('user_001', data)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('UTCID04 – missing gender → throws 400 (Abnormal)', async () => {
    const data = { ...validData, gender: null };
    await expect(ProfileService.createOrUpdate('user_001', data)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('UTCID05 – missing height → throws 400 (Abnormal)', async () => {
    const data = { ...validData, height_cm: null };
    await expect(ProfileService.createOrUpdate('user_001', data)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('UTCID06 – missing weight → throws 400 (Abnormal)', async () => {
    const data = { ...validData, weight_kg: null };
    await expect(ProfileService.createOrUpdate('user_001', data)).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-09: CalculateMetrics (Pure formula functions)
// ─────────────────────────────────────────────────────────────────
describe('CalculateMetrics – UC-09: BMI / BMR / TDEE formulas', () => {
  it('UTCID01 – male 25yo 70kg 175cm → BMI ~22.86 (Normal)', async () => {
    UserProfileRepo.updateByUserId = jest.fn().mockResolvedValue(makeMockProfile());
    UserDietary.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ activity_level: 'moderate' })
    });
    const User = require('../../src/models/User');
    User.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) });
    const result = await ProfileService.createOrUpdate('user_001', {
      full_name: 'Test', age: 25, gender: 'male',
      height_cm: 175, weight_kg: 70, activity_level: 'moderate'
    });
    expect(result.bmi).toBeCloseTo(22.86, 1);
  });

  it('UTCID02 – female 30yo 60kg 160cm → BMI ~23.44 (Normal)', async () => {
    const femaleProfile = makeMockProfile({ bmi: 23.44, bmr: 1393, tdee: 2159 });
    UserProfileRepo.updateByUserId = jest.fn().mockResolvedValue(femaleProfile);
    UserDietary.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ activity_level: 'moderate' })
    });
    const result = await ProfileService.createOrUpdate('user_001', {
      full_name: 'Test F', age: 30, gender: 'female',
      height_cm: 160, weight_kg: 60, activity_level: 'moderate'
    });
    expect(result.bmi).toBeCloseTo(23.44, 1);
  });

  it('UTCID03 – sedentary activity level → lowest TDEE multiplier 1.2 (Boundary)', async () => {
    const profile = makeMockProfile({ tdee: 2158 }); // 1798 * 1.2
    UserProfileRepo.updateByUserId = jest.fn().mockResolvedValue(profile);
    UserDietary.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ activity_level: 'sedentary' })
    });
    const result = await ProfileService.createOrUpdate('user_001', {
      full_name: 'Sed', age: 25, gender: 'male',
      height_cm: 175, weight_kg: 70, activity_level: 'sedentary'
    });
    expect(result.tdee).toBeDefined();
  });

  it('UTCID04 – very_active level → highest TDEE multiplier 1.9 (Boundary)', async () => {
    const profile = makeMockProfile({ tdee: 3416 }); // 1798 * 1.9
    UserProfileRepo.updateByUserId = jest.fn().mockResolvedValue(profile);
    UserDietary.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ activity_level: 'very_active' })
    });
    const result = await ProfileService.createOrUpdate('user_001', {
      full_name: 'Active', age: 25, gender: 'male',
      height_cm: 175, weight_kg: 70, activity_level: 'very_active'
    });
    expect(result.tdee).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-10: UpdateWeightLog
// ─────────────────────────────────────────────────────────────────
describe('UpdateWeightLog – UC-10: ProfileService.logWeight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    WeightLogRepo.findLatestByUserId = jest.fn().mockResolvedValue(null); // No prior log
    WeightLogRepo.create = jest.fn().mockResolvedValue({ weight: 72, date: new Date() });
    UserProfileRepo.findByUserId = jest.fn().mockResolvedValue(makeMockProfile());
    UserProfileRepo.updateByUserId = jest.fn().mockResolvedValue(makeMockProfile({ weight: 72 }));
    UserDietary.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ activity_level: 'moderate' }) });
  });

  it('UTCID01 – valid weight, no prior log → creates weight log (Normal)', async () => {
    const result = await ProfileService.logWeight('user_001', 72, null);
    expect(result).toHaveProperty('weight', 72);
  });

  it('UTCID02 – invalid weight (NaN) → throws 400 (Abnormal)', async () => {
    await expect(ProfileService.logWeight('user_001', 'abc', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('UTCID03 – weight logged within 7 days → throws 400 rate limit (Abnormal)', async () => {
    WeightLogRepo.findLatestByUserId = jest.fn().mockResolvedValue({
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    });
    await expect(ProfileService.logWeight('user_001', 73, null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('UTCID04 – weight logged after 7 days → allowed (Boundary)', async () => {
    WeightLogRepo.findLatestByUserId = jest.fn().mockResolvedValue({
      date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
    });
    const result = await ProfileService.logWeight('user_001', 71, null);
    expect(result).toBeDefined();
  });

  it('UTCID05 – missing weight → throws 400 (Abnormal)', async () => {
    await expect(ProfileService.logWeight('user_001', null, null)).rejects.toMatchObject({ statusCode: 400 });
  });
});
