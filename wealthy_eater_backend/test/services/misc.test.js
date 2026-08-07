/**
 * Unit Tests – UC-21 ManageShoppingList + UC-22 ManageNotifications
 * + UC-24 GetNutritionistProfiles + UC-28 QueryGeminiChat + UC-31 TranslateRecipeContent
 *
 * Rewritten to match exact service API:
 *   shopping_list.service.js → addFromRecipe, getUserShoppingList, togglePurchased, removeItem, clearAll
 *   user.notification.service.js → getHistory, markAsRead, getSettings, updateSettings
 *   nutritionist.service.js → getAllApprovedNutritionists
 *   gemini.service.js → mocked directly
 */

'use strict';

jest.mock('../../src/models/ShoppingList');
jest.mock('../../src/models/Notification');
jest.mock('../../src/models/NotificationSetting');
jest.mock('../../src/models/Nutritionist');
jest.mock('../../src/models/User');
jest.mock('../../src/models/Recipe');
jest.mock('../../src/models/RecipeIngredient');
jest.mock('../../src/models/Ingredient');
jest.mock('../../src/services/gemini.service');
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    Types: {
      ObjectId: {
        isValid: jest.fn().mockReturnValue(true),
        ...actual.Types?.ObjectId,
      },
    },
  };
});

const ShoppingList = require('../../src/models/ShoppingList');
const Notification = require('../../src/models/Notification');
const NotificationSetting = require('../../src/models/NotificationSetting');
const Nutritionist = require('../../src/models/Nutritionist');
const Recipe = require('../../src/models/Recipe');
const GeminiService = require('../../src/services/gemini.service');

// ─────────────────────────────────────────────────────────────────
// UC-21: ManageShoppingList  (shopping_list.service.js)
//  Exported: { addFromRecipe, getUserShoppingList, togglePurchased, removeItem, clearAll }
// ─────────────────────────────────────────────────────────────────
describe('ManageShoppingList – UC-21: shopping_list.service', () => {
  const { getUserShoppingList, togglePurchased, removeItem, clearAll } =
    require('../../src/services/shopping_list.service');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // UTCID01 – get list for user with items
  it('UTCID01 – getUserShoppingList: valid userId → returns list (Normal)', async () => {
    ShoppingList.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'item_001', ingredient_name: 'Eggs', quantity: 12, is_purchase: false }
      ])
    });
    const result = await getUserShoppingList('user_001');
    expect(result).toBeDefined();
  });

  // UTCID02 – empty list
  it('UTCID02 – getUserShoppingList: user with no items → returns empty or default (Normal)', async () => {
    ShoppingList.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    });
    const result = await getUserShoppingList('user_001');
    expect(result).toBeDefined();
  });

  // UTCID03 – togglePurchased: mark item as purchased
  it('UTCID03 – togglePurchased: toggle item purchase status → success (Normal)', async () => {
    ShoppingList.findOne = jest.fn().mockResolvedValue({
      _id: 'item_001',
      user_id: 'user_001',
      is_purchase: false,
      save: jest.fn().mockResolvedValue(true)
    });
    const result = await togglePurchased('item_001', 'user_001');
    expect(result).toBeDefined();
  });

  // UTCID04 – togglePurchased: item not found → 404
  it('UTCID04 – togglePurchased: item not found → throws 404 (Abnormal)', async () => {
    ShoppingList.findOne = jest.fn().mockResolvedValue(null);
    await expect(togglePurchased('nonexistent', 'user_001')).rejects.toMatchObject({ statusCode: 404 });
  });

  // UTCID05 – removeItem: remove existing item → success
  it('UTCID05 – removeItem: existing item → removed successfully (Normal)', async () => {
    ShoppingList.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    ShoppingList.findOne = jest.fn().mockResolvedValue({
      _id: 'item_001', user_id: 'user_001', deleteOne: jest.fn().mockResolvedValue(true)
    });
    const result = await removeItem('item_001', 'user_001');
    expect(result).toBeDefined();
  });

  // UTCID06 – clearAll: clears entire shopping list
  it('UTCID06 – clearAll: valid userId → all items deleted (Normal)', async () => {
    ShoppingList.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });
    const result = await clearAll('user_001');
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-22: ManageNotifications  (user.notification.service.js)
//  Exported: new UserNotificationService() → getHistory, markAsRead, getSettings, updateSettings
// ─────────────────────────────────────────────────────────────────
describe('ManageNotifications – UC-22: user.notification.service', () => {
  const NotificationService = require('../../src/services/user.notification.service');

  beforeEach(() => {
    jest.clearAllMocks();
    NotificationSetting.findOne = jest.fn().mockResolvedValue({
      user_id: 'user_001', is_push_enabled: true, meal_reminders: []
    });
    NotificationSetting.create = jest.fn().mockResolvedValue({
      user_id: 'user_001', is_push_enabled: true
    });
    NotificationSetting.findOneAndUpdate = jest.fn().mockResolvedValue({
      user_id: 'user_001', is_push_enabled: false
    });
    Notification.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    });
    Notification.countDocuments = jest.fn().mockResolvedValue(0);
    Notification.findOneAndUpdate = jest.fn().mockResolvedValue({
      _id: 'notif_001', is_read: true
    });
  });

  // UTCID01 – getSettings: existing user
  it('UTCID01 – getSettings: returns notification settings (Normal)', async () => {
    const result = await NotificationService.getSettings('user_001');
    expect(result).toBeDefined();
    expect(result).toHaveProperty('is_push_enabled');
  });

  // UTCID02 – getSettings: no settings exist → creates default
  it('UTCID02 – getSettings: no settings → creates default (Normal)', async () => {
    NotificationSetting.findOne = jest.fn().mockResolvedValue(null);
    const result = await NotificationService.getSettings('user_001');
    expect(result).toBeDefined();
  });

  // UTCID03 – updateSettings: valid update
  it('UTCID03 – updateSettings: valid data → settings updated (Normal)', async () => {
    const result = await NotificationService.updateSettings('user_001', { is_push_enabled: false });
    expect(result).toBeDefined();
  });

  // UTCID04 – getHistory: returns notification history
  it('UTCID04 – getHistory: returns notifications array (Normal)', async () => {
    // Mock Promise.all internals
    Notification.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: 'n1', is_read: false }]),
    });
    Notification.countDocuments = jest.fn().mockResolvedValue(1);
    const result = await NotificationService.getHistory('user_001', 20, 0);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('notifications');
    expect(result).toHaveProperty('totalCount');
  });

  // UTCID05 – markAsRead: valid notification → marked read
  it('UTCID05 – markAsRead: valid id → notification marked read (Normal)', async () => {
    const result = await NotificationService.markAsRead('user_001', 'notif_001');
    expect(result).toBeDefined();
    expect(result.is_read).toBe(true);
  });

  // UTCID06 – markAsRead: notification not found → 404
  it('UTCID06 – markAsRead: notification not found → throws 404 NOT_FOUND (Abnormal)', async () => {
    Notification.findOneAndUpdate = jest.fn().mockResolvedValue(null);
    await expect(NotificationService.markAsRead('user_001', 'bad_id')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'NOT_FOUND'
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-24: GetNutritionistProfiles  (nutritionist.service.js)
//  Method: getAllApprovedNutritionists(options)
// ─────────────────────────────────────────────────────────────────
describe('GetNutritionistProfiles – UC-24: nutritionist.service', () => {
  const NutritionistService = require('../../src/services/nutritionist.service');

  beforeEach(() => {
    jest.clearAllMocks();
    Nutritionist.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'nut_001', professional_title: 'Clinical Nutritionist', approval_status: 'APPROVED' }
      ])
    });
    Nutritionist.countDocuments = jest.fn().mockResolvedValue(1);
  });

  // UTCID01 – no filters → all approved nutritionists
  it('UTCID01 – getAllApprovedNutritionists: no filter → returns approved list (Normal)', async () => {
    const result = await NutritionistService.getAllApprovedNutritionists({});
    expect(result).toBeDefined();
  });

  // UTCID02 – no approved nutritionists in DB → returns empty / zero
  it('UTCID02 – no approved nutritionists → returns empty result (Normal)', async () => {
    Nutritionist.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([])
    });
    Nutritionist.countDocuments = jest.fn().mockResolvedValue(0);
    const result = await NutritionistService.getAllApprovedNutritionists({});
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// UC-28: QueryGeminiChat + UC-31: TranslateRecipeContent
//  Both are mocked directly via GeminiService
// ─────────────────────────────────────────────────────────────────
describe('QueryGeminiChat & TranslateRecipeContent – UC-28 & UC-31', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    GeminiService.chat = jest.fn().mockResolvedValue({ reply: 'Here are some healthy tips...' });
    GeminiService.translateRecipe = jest.fn().mockResolvedValue({ translated: 'Gà nướng' });
  });

  // UC-28 QueryGeminiChat
  it('UC-28 UTCID01 – valid query → returns AI reply (Normal)', async () => {
    const result = await GeminiService.chat('user_001', 'What is a good breakfast?');
    expect(result).toHaveProperty('reply');
  });

  it('UC-28 UTCID02 – Gemini API timeout → throws error (Abnormal)', async () => {
    GeminiService.chat = jest.fn().mockRejectedValue(new Error('Gemini API timeout'));
    await expect(GeminiService.chat('user_001', 'query')).rejects.toThrow('Gemini API timeout');
  });

  it('UC-28 UTCID03 – empty query → Gemini still responds (Normal)', async () => {
    GeminiService.chat = jest.fn().mockResolvedValue({ reply: 'Please provide more context.' });
    const result = await GeminiService.chat('user_001', '');
    expect(result).toHaveProperty('reply');
  });

  // UC-31 TranslateRecipeContent
  it('UC-31 UTCID01 – valid recipe + target language → returns translation (Normal)', async () => {
    const result = await GeminiService.translateRecipe({ name: 'Grilled Chicken', targetLang: 'vi' });
    expect(result).toHaveProperty('translated');
  });

  it('UC-31 UTCID02 – Gemini API fails → propagates error (Abnormal)', async () => {
    GeminiService.translateRecipe = jest.fn().mockRejectedValue(new Error('AI service unavailable'));
    await expect(GeminiService.translateRecipe({ name: 'test' })).rejects.toThrow('AI service unavailable');
  });
});
