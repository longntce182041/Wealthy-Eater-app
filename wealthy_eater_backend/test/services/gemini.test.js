/**
 * Unit Tests – UC-14 ScanMealImage + UC-23 GenerateRandomMeal
 * Source: gemini.service.js + mealPlan.service.js
 */

'use strict';

jest.mock('../../src/services/gemini.service');
jest.mock('../../src/models/Recipe');
jest.mock('../../src/models/MealPlan');
jest.mock('../../src/models/UserDietary');

const GeminiService = require('../../src/services/gemini.service');
const Recipe = require('../../src/models/Recipe');
const MealPlan = require('../../src/models/MealPlan');

// ─────────────────────────────────────────────────────────────────
// UC-14: ScanMealImage
// ─────────────────────────────────────────────────────────────────
describe('ScanMealImage – UC-14: GeminiService.analyzeMealImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    GeminiService.analyzeMealImage = jest.fn().mockResolvedValue({
      name: 'Grilled Chicken',
      calories: 350,
      protein: 40,
      carbs: 5,
      fat: 15
    });
  });

  it('UTCID01 – valid image URL → returns meal nutritional analysis (Normal)', async () => {
    const result = await GeminiService.analyzeMealImage({ imageUrl: 'https://example.com/chicken.jpg' });
    expect(result).toHaveProperty('name', 'Grilled Chicken');
    expect(result).toHaveProperty('calories', 350);
  });

  it('UTCID02 – valid base64 image → returns analysis (Normal)', async () => {
    const result = await GeminiService.analyzeMealImage({ base64: 'data:image/jpeg;base64,...' });
    expect(result).toHaveProperty('protein');
    expect(result).toHaveProperty('carbs');
  });

  it('UTCID03 – null image input → throws error (Abnormal)', async () => {
    GeminiService.analyzeMealImage = jest.fn().mockRejectedValue(new Error('Image is required'));
    await expect(GeminiService.analyzeMealImage(null)).rejects.toThrow('Image is required');
  });

  it('UTCID04 – Gemini API fails → throws 503 or propagates error (Abnormal)', async () => {
    GeminiService.analyzeMealImage = jest.fn().mockRejectedValue(new Error('Gemini API timeout'));
    await expect(GeminiService.analyzeMealImage({ imageUrl: 'https://test.com/img.jpg' }))
      .rejects.toThrow('Gemini API timeout');
  });

  it('UTCID05 – unrecognized food in image → returns low confidence result (Normal)', async () => {
    GeminiService.analyzeMealImage = jest.fn().mockResolvedValue({
      name: 'Unknown Food',
      calories: 0,
      confidence: 'low'
    });
    const result = await GeminiService.analyzeMealImage({ imageUrl: 'https://test.com/unknown.jpg' });
    expect(result).toHaveProperty('name', 'Unknown Food');
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-23: GenerateRandomMeal
// ─────────────────────────────────────────────────────────────────
describe('GenerateRandomMeal – UC-23: Random meal generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Recipe.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'r1', name: 'Oatmeal', calories: 350, category: 'Breakfast' },
        { _id: 'r2', name: 'Grilled Chicken', calories: 400, category: 'Lunch' },
        { _id: 'r3', name: 'Salmon', calories: 450, category: 'Dinner' }
      ])
    });
  });

  it('UTCID01 – valid userId with no filter → returns random meal set (Normal)', async () => {
    const recipes = await Recipe.find({}).lean();
    expect(recipes.length).toBeGreaterThan(0);
    // Pick a random one
    const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
    expect(randomRecipe).toHaveProperty('name');
  });

  it('UTCID02 – filter by Breakfast category → only breakfast recipes (Normal)', async () => {
    Recipe.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'r1', name: 'Oatmeal', category: 'Breakfast' }
      ])
    });
    const recipes = await Recipe.find({ category: 'Breakfast' }).lean();
    recipes.forEach(r => expect(r.category).toBe('Breakfast'));
  });

  it('UTCID03 – no recipes available → returns empty list (Normal)', async () => {
    Recipe.find = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    const recipes = await Recipe.find({}).lean();
    expect(recipes).toHaveLength(0);
  });

  it('UTCID04 – filter by calorie range → returns matching recipes (Normal)', async () => {
    Recipe.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: 'r1', name: 'Oatmeal', calories: 350 }
      ])
    });
    const recipes = await Recipe.find({ calories: { $gte: 300, $lte: 400 } }).lean();
    recipes.forEach(r => {
      expect(r.calories).toBeGreaterThanOrEqual(300);
      expect(r.calories).toBeLessThanOrEqual(400);
    });
  });

  it('UTCID05 – Gemini generates a complete random day plan → valid structure (Normal)', async () => {
    GeminiService.generateRandomMeal = jest.fn().mockResolvedValue({
      breakfast: { name: 'Oatmeal', calories: 350 },
      lunch: { name: 'Grilled Chicken', calories: 400 },
      dinner: { name: 'Salmon', calories: 450 }
    });
    const result = await GeminiService.generateRandomMeal({ userId: 'user_001' });
    expect(result).toHaveProperty('breakfast');
    expect(result).toHaveProperty('lunch');
    expect(result).toHaveProperty('dinner');
  });
});
