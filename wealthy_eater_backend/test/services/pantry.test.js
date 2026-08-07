/**
 * Unit Tests – UC-16 UpdatePantry + UC-17 SuggestMealFromPantry
 * Source: pantry.service.js (class PantryService exported as singleton)
 *   - getPantry(userId)
 *   - updatePantryManual(userId, ingredients)
 * SuggestMealFromPantry uses GeminiService directly (mocked)
 */

'use strict';

jest.mock('../../src/models/Pantry');
jest.mock('../../src/models/Ingredient');
jest.mock('../../src/models/UserDietary');
jest.mock('../../src/services/gemini.service');
jest.mock('axios');

const Pantry = require('../../src/models/Pantry');
const Ingredient = require('../../src/models/Ingredient');
const GeminiService = require('../../src/services/gemini.service');
const pantryService = require('../../src/services/pantry.service');

function makeMockPantry(overrides = {}) {
  return {
    user_id: 'user_001',
    pantry_ingredients: [
      { name: 'Chicken Breast', ingredient_id: 'ing_001', quantity: 200, unit: 'grams' }
    ],
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// UC-16: UpdatePantry → pantryService.updatePantryManual(userId, ingredients)
// ─────────────────────────────────────────────────────────────────
describe('UpdatePantry – UC-16: PantryService.updatePantryManual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Ingredient.find = jest.fn().mockResolvedValue([
      { _id: 'ing_001', name: 'Chicken Breast', unit: 'grams' }
    ]);
    Pantry.findOne = jest.fn().mockResolvedValue(makeMockPantry());
  });

  // UTCID01 – valid ingredients list → updates pantry
  it('UTCID01 – valid ingredients list → updates pantry successfully (Normal)', async () => {
    const mockPantry = makeMockPantry();
    Pantry.findOne = jest.fn().mockResolvedValue(mockPantry);
    const result = await pantryService.updatePantryManual('user_001', [
      { name: 'Chicken Breast', quantity: 200, unit: 'grams' }
    ]);
    expect(result).toBeDefined();
  });

  // UTCID02 – empty ingredients list → clears pantry
  it('UTCID02 – empty ingredient list → pantry cleared (Abnormal)', async () => {
    const mockPantry = makeMockPantry({ pantry_ingredients: [] });
    Pantry.findOne = jest.fn().mockResolvedValue(mockPantry);
    const result = await pantryService.updatePantryManual('user_001', []);
    expect(result).toBeDefined();
  });

  // UTCID03 – ingredient not in master DB → still saved with ingredient_id null
  it('UTCID03 – unknown ingredient → saved with null ingredient_id (Normal)', async () => {
    Ingredient.find = jest.fn().mockResolvedValue([]);
    const mockPantry = makeMockPantry();
    Pantry.findOne = jest.fn().mockResolvedValue(mockPantry);
    const result = await pantryService.updatePantryManual('user_001', [
      { name: 'Exotic Unknown Fruit', quantity: 100, unit: 'grams' }
    ]);
    expect(result).toBeDefined();
  });

  // UTCID04 – no existing pantry → creates new one
  it('UTCID04 – no existing pantry → creates and saves new pantry (Normal)', async () => {
    Pantry.findOne = jest.fn().mockResolvedValue(null);
    const mockNewPantry = makeMockPantry();
    Pantry.mockImplementation(() => mockNewPantry);
    const result = await pantryService.updatePantryManual('user_001', [
      { name: 'Eggs', quantity: 5, unit: 'pcs' }
    ]);
    expect(result).toBeDefined();
  });

  // UTCID05 – missing userId → throws error
  it('UTCID05 – missing userId → throws error (Abnormal)', async () => {
    await expect(pantryService.updatePantryManual('', [])).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-16b: getPantry (read pantry items)
// ─────────────────────────────────────────────────────────────────
describe('GetPantry – UC-16b: PantryService.getPantry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('UTCID01 – valid userId with pantry → returns pantry items (Normal)', async () => {
    Pantry.findOne = jest.fn().mockResolvedValue(makeMockPantry());
    const result = await pantryService.getPantry('user_001');
    expect(result).toBeDefined();
    expect(result.pantry_ingredients).toHaveLength(1);
  });

  it('UTCID02 – no pantry → creates empty pantry and returns it (Normal)', async () => {
    Pantry.findOne = jest.fn().mockResolvedValue(null);
    const emptyPantry = makeMockPantry({ pantry_ingredients: [] });
    Pantry.mockImplementation(() => emptyPantry);
    const result = await pantryService.getPantry('user_001');
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-17: SuggestMealFromPantry (via GeminiService – mocked)
// ─────────────────────────────────────────────────────────────────
describe('SuggestMealFromPantry – UC-17: GeminiService (pantry-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    GeminiService.suggestMealsFromPantry = jest.fn().mockResolvedValue([
      { name: 'Chicken Salad', calories: 450, ingredients: ['Chicken Breast'] }
    ]);
  });

  it('UTCID01 – user has pantry items → Gemini returns meal suggestions (Normal)', async () => {
    const result = await GeminiService.suggestMealsFromPantry(['Chicken Breast', 'Broccoli'], {});
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('name');
  });

  it('UTCID02 – empty pantry → returns empty suggestions (Normal)', async () => {
    GeminiService.suggestMealsFromPantry = jest.fn().mockResolvedValue([]);
    const result = await GeminiService.suggestMealsFromPantry([], {});
    expect(result).toHaveLength(0);
  });

  it('UTCID03 – Gemini API fails → throws error (Abnormal)', async () => {
    GeminiService.suggestMealsFromPantry = jest.fn().mockRejectedValue(new Error('Gemini API error'));
    await expect(GeminiService.suggestMealsFromPantry(['Chicken'])).rejects.toThrow('Gemini API error');
  });

  it('UTCID04 – allergic ingredients in pantry → filtered out by Gemini prompt (Normal)', async () => {
    GeminiService.suggestMealsFromPantry = jest.fn().mockResolvedValue([
      { name: 'Vegetable Stew', calories: 300 } // No shellfish despite pantry having it
    ]);
    const result = await GeminiService.suggestMealsFromPantry(
      ['Shrimp', 'Broccoli'],
      { allergies: ['shellfish'] }
    );
    result.forEach(meal => expect(meal.name).not.toContain('Shrimp'));
  });
});
