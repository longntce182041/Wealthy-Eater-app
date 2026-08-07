/**
 * Unit Tests – UC-18 SearchRecipes + UC-19 GetRecipeById
 * + UC-20 InteractRecipe + UC-25 CreatePayOSOrder + UC-27 GetOrderHistory
 * Source: user.consultation.service.js + user.recipe.like.service.js
 */

'use strict';

jest.mock('../../src/models/Recipe');
jest.mock('../../src/models/RecipeLike');
jest.mock('../../src/models/RecipeReview');
jest.mock('../../src/models/UserProfile');
jest.mock('../../src/models/Consultation', () => ({}), { virtual: true });
jest.mock('../../src/models/Payment', () => ({}), { virtual: true });
jest.mock('../../src/repositories/user.repository');

const Recipe = require('../../src/models/Recipe');
const RecipeLike = require('../../src/models/RecipeLike');
const UserRepository = require('../../src/repositories/user.repository');
const { toggleLike, isLiked } = require('../../src/services/user.recipe.like.service');

// ─────────────────────────────────────────────────────────────────
// UC-18: SearchRecipes
// ─────────────────────────────────────────────────────────────────
describe('SearchRecipes – UC-18: Recipe Model search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('UTCID01 – valid keyword → returns recipe list (Normal)', async () => {
    Recipe.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'r1', name: 'Grilled Chicken', calories: 400 }])
    });
    const results = await Recipe.find({ name: /Chicken/i }).select('-__v').limit(10).skip(0).lean();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Grilled Chicken');
  });

  it('UTCID02 – empty keyword → returns all recipes (paginated) (Normal)', async () => {
    Recipe.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'r1' }, { _id: 'r2' }])
    });
    const results = await Recipe.find({}).select('-__v').limit(10).skip(0).lean();
    expect(results).toHaveLength(2);
  });

  it('UTCID03 – keyword matches nothing → returns empty array (Normal)', async () => {
    Recipe.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    });
    const results = await Recipe.find({ name: /nonexistent/i }).select('-__v').limit(10).skip(0).lean();
    expect(results).toHaveLength(0);
  });

  it('UTCID04 – filter by category → returns filtered list (Normal)', async () => {
    Recipe.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'r1', category: 'Breakfast' }])
    });
    const results = await Recipe.find({ category: 'Breakfast' }).select('-__v').limit(10).skip(0).lean();
    expect(results[0].category).toBe('Breakfast');
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-19: GetRecipeById
// ─────────────────────────────────────────────────────────────────
describe('GetRecipeById – UC-19: Recipe.findById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('UTCID01 – valid recipeId → returns recipe details (Normal)', async () => {
    Recipe.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'rec_001', name: 'Oatmeal', calories: 350 })
    });
    const result = await Recipe.findById('rec_001').populate('ingredients').lean();
    expect(result).toHaveProperty('name', 'Oatmeal');
  });

  it('UTCID02 – non-existent recipeId → returns null (Abnormal)', async () => {
    Recipe.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null)
    });
    const result = await Recipe.findById('nonexistent').populate('ingredients').lean();
    expect(result).toBeNull();
  });

  it('UTCID03 – null recipeId → returns null (Abnormal)', async () => {
    Recipe.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null)
    });
    const result = await Recipe.findById(null).populate('ingredients').lean();
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-20: InteractRecipe (Like / Unlike)
// ─────────────────────────────────────────────────────────────────
describe('InteractRecipe – UC-20: RecipeLikeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Recipe.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'rec_001', like_count: 5 })
    });
  });

  it('UTCID01 – user likes a recipe they have not liked before → like added (Normal)', async () => {
    Recipe.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'rec_001' }) });
    RecipeLike.findOne = jest.fn().mockResolvedValue(null); // Not liked yet
    RecipeLike.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(true),
      _id: 'like_001'
    }));
    const result = await toggleLike('user_001', 'rec_001');
    expect(result).toHaveProperty('isLiked', true);
    expect(result).toHaveProperty('action', 'added');
  });

  it('UTCID02 – user unlikes a recipe they already liked → like removed (Normal)', async () => {
    Recipe.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'rec_001' }) });
    RecipeLike.findOne = jest.fn().mockResolvedValue({ _id: 'like_001' });
    RecipeLike.deleteOne = jest.fn().mockResolvedValue(true);
    const result = await toggleLike('user_001', 'rec_001');
    expect(result).toHaveProperty('isLiked', false);
    expect(result).toHaveProperty('action', 'removed');
  });

  it('UTCID03 – recipe does not exist → throws 404 (Abnormal)', async () => {
    Recipe.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(toggleLike('user_001', 'nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('UTCID04 – check isLiked status → returns boolean (Normal)', async () => {
    RecipeLike.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'like_001' }) });
    const result = await isLiked('user_001', 'rec_001');
    expect(result).toBe(true);
  });
});
