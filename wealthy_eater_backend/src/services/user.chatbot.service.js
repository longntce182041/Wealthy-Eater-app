/**
 * user.chatbot.service.js — Business logic for the AI Nutrition Chatbot.
 *
 * Responsibilities:
 *  1. Load personalised user context (Profile, Dietary, recent MealLogs,
 *     active ConsultationContract) from MongoDB.
 *  2. Fetch or create a ChatbotSession for the authenticated user.
 *  3. Build an enriched, Vietnamese system prompt from user data.
 *  4. Append the user's message, call the Gemini API, then persist the
 *     model's reply — all within a single request lifecycle.
 *  5. Provide helpers for listing history and resetting a session.
 *
 * Error codes used:
 *  - USER_PROFILE_REQUIRED  (400) — user hasn't set up their profile yet
 *  - GEMINI_API_ERROR       (502) — upstream Gemini call failed
 *  - RATE_LIMIT_EXCEEDED    (429) — > MAX_MESSAGES_PER_MINUTE from this user
 *  - SESSION_NOT_FOUND      — internal; resolved by auto-creating a new one
 */

const ChatbotSession = require('../models/ChatbotSession');
const UserProfile = require('../models/UserProfile');
const UserDietary = require('../models/UserDietary');
const CustomerMealLog = require('../models/CustomerMealLog');
const ConsultationContract = require('../models/ConsultationContract');
const WeightLog = require('../models/WeightLog');
const MealPlan = require('../models/MealPlan');
const MealPlanItem = require('../models/MealPlanItem');
const NutritionAssessment = require('../models/NutritionAssessment');
const AppError = require('../utils/AppError');

// ── Constants ─────────────────────────────────────────────────────────────────

// Constants related to Gemini Cascade have been moved to gemini.service.js
const MAX_CONTEXT_TURNS = 20;   // last 20 messages sent to Gemini (10 pairs)
const MAX_MESSAGES_PER_MINUTE = 10; // soft rate-limit per user
const MEAL_LOG_DAYS = 3;    // how many recent days of logs to include
const WEIGHT_LOG_LIMIT = 7;    // last N weight logs to show trend

// Centralized Gemini Service is now responsible for API Keys and Circuit Breaker
const geminiService = require('./gemini.service');

// ── In-memory rate-limit tracker (resets on server restart — acceptable) ──────
// Map<userId, { count: number, windowStart: number }>
const _rateLimitMap = new Map();

// ── Service Class ─────────────────────────────────────────────────────────────

class UserChatbotService {
  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC: Send a message and get an AI reply
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Process a user's chatbot message end-to-end.
   *
   * @param {string} userId     — Authenticated user ID from JWT
   * @param {string} message    — The user's question / message
   * @param {string} [sessionId] — Optional: resume a specific session
   * @returns {{ reply: string, sessionId: string, role: 'model' }}
   */
  async sendMessage(userId, message, sessionId = null) {
    // 1. Rate-limit check
    this._checkRateLimit(userId);

    // 2. Load user context (parallel)
    const context = await this._loadUserContext(userId);

    if (!context.profile) {
      throw new AppError(
        'You need to complete your personal profile before using the AI assistant.',
        400,
        'USER_PROFILE_REQUIRED'
      );
    }

    // 3. Get or create an active session
    const session = await this._getOrCreateSession(userId, sessionId);

    // 4. Append user turn
    session.messages.push({ role: 'user', content: message.trim() });

    // 5. Trim to max messages (keep the oldest system context + newest turns)
    if (session.messages.length > ChatbotSession.MAX_MESSAGES) {
      session.messages = session.messages.slice(
        session.messages.length - ChatbotSession.MAX_MESSAGES
      );
    }

    // 6. Build Gemini payload (system prompt + last N turns for context)
    const systemPrompt = this._buildSystemPrompt(context);
    const conversationTurns = this._buildConversationHistory(session.messages);

    // 7. Call Gemini API
    const reply = await this._callGemini(systemPrompt, conversationTurns);

    // 8. Append model reply
    session.messages.push({ role: 'model', content: reply });

    // Trim again after appending model reply
    if (session.messages.length > ChatbotSession.MAX_MESSAGES) {
      session.messages = session.messages.slice(
        session.messages.length - ChatbotSession.MAX_MESSAGES
      );
    }

    // 9. Persist session
    await session.save();

    return {
      reply,
      role: 'model',
      sessionId: session._id,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC: Get conversation history for the active session
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Returns messages from the user's active chatbot session.
   *
   * @param {string} userId
   * @param {number} limit — max messages to return (default 20)
   * @returns {{ sessionId: string|null, messages: Object[] }}
   */
  async getHistory(userId, limit = 20) {
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const session = await ChatbotSession.findOne({
      user_id: userId,
      is_active: true,
    }).lean();

    if (!session) {
      return { sessionId: null, messages: [] };
    }

    // Return newest messages first (slice from end)
    const messages = session.messages.slice(-safeLimit).reverse();

    return {
      sessionId: session._id,
      messages,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC: Reset (soft-delete) the active session
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Deactivates the current session so the next message starts fresh.
   *
   * @param {string} userId
   * @returns {{ cleared: boolean }}
   */
  async resetSession(userId) {
    const result = await ChatbotSession.updateMany(
      { user_id: userId, is_active: true },
      { $set: { is_active: false } }
    );

    return { cleared: result.modifiedCount > 0 };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE: Rate Limit
  // ───────────────────────────────────────────────────────────────────────────

  _checkRateLimit(userId) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    if (!_rateLimitMap.has(userId)) {
      _rateLimitMap.set(userId, { count: 1, windowStart: now });
      return;
    }

    const record = _rateLimitMap.get(userId);

    // Reset window if expired
    if (now - record.windowStart > windowMs) {
      record.count = 1;
      record.windowStart = now;
      return;
    }

    record.count += 1;

    if (record.count > MAX_MESSAGES_PER_MINUTE) {
      throw new AppError(
        `You are sending too many messages. Please wait a moment and try again.`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE: Load User Context
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Loads all personalisation data in parallel to minimise latency.
   */
  async _loadUserContext(userId) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - MEAL_LOG_DAYS);

    // Find the active meal plan ID first (needed for MealPlanItem sub-query)
    const activeMealPlan = await MealPlan.findOne({
      user_id: userId,
      status: 'PUBLISHED',
    })
      .sort({ date: -1 })
      .lean();

    const [profile, dietary, recentLogs, activeContract, recentWeightLogs, mealPlanItems, nutritionAssessment] = await Promise.all([
      UserProfile.findOne({ user_id: userId }).lean(),

      UserDietary.findOne({ user_id: userId })
        .populate({ path: 'medical_condition_id', select: 'name dietary_guideline' })
        .populate({ path: 'allergies', select: 'name' })
        .populate({ path: 'dislike_ingredients', select: 'name' })
        .lean(),

      CustomerMealLog.find({
        user_id: userId,
        create_at: { $gte: threeDaysAgo },
      })
        .sort({ create_at: -1 })
        .limit(15)
        .lean(),

      ConsultationContract.findOne({
        user_id: userId,
        status: 'active',
      })
        .populate({ path: 'nutritionist_id', select: 'full_name specialization' })
        .lean(),

      // Weight trend: last 7 entries sorted newest first
      WeightLog.find({ user_id: userId })
        .sort({ date: -1 })
        .limit(WEIGHT_LOG_LIMIT)
        .lean(),

      // Today's meal plan items (if active plan exists)
      activeMealPlan
        ? MealPlanItem.find({ meal_plan_id: activeMealPlan._id })
          .populate({ path: 'recipe_id', select: 'name' })
          .lean()
        : Promise.resolve([]),

      // Latest nutritionist assessment for this user
      NutritionAssessment.findOne({ user_id: userId })
        .populate({ path: 'nutritionist_id', select: 'full_name' })
        .sort({ _id: -1 })
        .lean(),
    ]);

    return {
      profile,
      dietary,
      recentLogs,
      activeContract,
      recentWeightLogs,
      activeMealPlan: activeMealPlan ? { ...activeMealPlan, items: mealPlanItems } : null,
      nutritionAssessment,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE: Get or Create Session
  // ───────────────────────────────────────────────────────────────────────────

  async _getOrCreateSession(userId, sessionId) {
    // If a specific sessionId was requested, validate ownership
    if (sessionId) {
      const existing = await ChatbotSession.findOne({
        _id: sessionId,
        user_id: userId,
        is_active: true,
      });
      if (existing) return existing;
    }

    // Find the active session for this user
    const active = await ChatbotSession.findOne({
      user_id: userId,
      is_active: true,
    });

    if (active) return active;

    // Create a fresh session
    return ChatbotSession.create({ user_id: userId, messages: [] });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE: Build System Prompt
  // ───────────────────────────────────────────────────────────────────────────

  _sanitizeForPrompt(text) {
    if (!text) return '';
    return text.toString().replace(/[\n\r<>{}]/g, ' ').trim();
  }

  /**
   * Constructs a rich, personalised system prompt.
   * This is injected as the first "user" turn with a "model" acknowledgement
   * before the real conversation, which is the standard Gemini pattern for
   * system instructions in multi-turn chat.
   */
  _buildSystemPrompt(context) {
    const { profile, dietary, recentLogs, activeContract, recentWeightLogs, activeMealPlan, nutritionAssessment } = context;

    // ── Profile block ───────────────────────────────────────────────────────
    const profileBlock = profile
      ? `PERSONAL PROFILE:
- Full Name: ${this._sanitizeForPrompt(profile.full_name) || 'Not provided'}
- Age: ${profile.age || 'Unknown'} | Gender: ${profile.gender || 'Unknown'}
- Height: ${profile.height || '?'} cm | Weight: ${profile.weight || '?'} kg
- BMI: ${profile.bmi ? profile.bmi.toFixed(1) : 'Not calculated'} | BMR: ${profile.bmr ? Math.round(profile.bmr) : 'Not calculated'} kcal/day
- TDEE (Total Daily Energy Expenditure): ${profile.tdee ? Math.round(profile.tdee) : 'Not calculated'} kcal/day
- Health Goal: ${this._sanitizeForPrompt(profile.health_goal) || 'Not set'}`
      : 'PERSONAL PROFILE: User has not updated their profile.';

    // ── Weight trend block ──────────────────────────────────────────────────
    let weightTrendBlock = 'WEIGHT HISTORY: No data.';
    if (recentWeightLogs?.length >= 2) {
      // logs are sorted newest-first
      const latest = recentWeightLogs[0];
      const oldest = recentWeightLogs[recentWeightLogs.length - 1];
      const delta = (latest.weight - oldest.weight).toFixed(1);
      const trend = delta > 0 ? `▲ +${delta} kg` : delta < 0 ? `▼ ${delta} kg` : '→ Unchanged';
      const entries = recentWeightLogs
        .map((w) => `  • ${new Date(w.date).toLocaleDateString('en-US')}: ${w.weight} kg`)
        .join('\n');
      weightTrendBlock = `WEIGHT HISTORY (last ${recentWeightLogs.length} entries — Trend: ${trend}):
${entries}`;
    } else if (recentWeightLogs?.length === 1) {
      weightTrendBlock = `WEIGHT HISTORY: ${recentWeightLogs[0].weight} kg (only 1 entry, trend unknown).`;
    }

    // ── Dietary block ───────────────────────────────────────────────────────
    let dietaryBlock = 'NUTRITION INFO: No data.';
    if (dietary) {
      const allergies = dietary.allergies?.length
        ? dietary.allergies.map((a) => a.name).join(', ')
        : 'None';
      const dislikes = dietary.dislike_ingredients?.length
        ? dietary.dislike_ingredients.map((i) => i.name).join(', ')
        : 'None';
      const preferences = dietary.diet_preferences?.length
        ? dietary.diet_preferences.join(', ')
        : 'Unknown';

      let medicalConditionText = 'None';
      if (dietary.medical_condition_id) {
        const mc = dietary.medical_condition_id;
        medicalConditionText = `${mc.name} (Dietary Guideline: ${mc.dietary_guideline || 'None'})`;
      }

      dietaryBlock = `NUTRITION INFO:
- ⚠️ MEDICAL CONDITION (MUST PRIORITIZE): ${medicalConditionText}
- ⚠️ ALLERGIES (STRICTLY AVOID): ${allergies}
- Disliked ingredients: ${dislikes}
- Diet preferences: ${preferences}
- Activity level: ${dietary.activity_level || 'Not provided'}
- Cooking skill: ${dietary.cooking_skill_level || 'Unknown'}
- Max cooking time: ${dietary.available_cooking_time ? dietary.available_cooking_time + ' minutes' : 'Unknown'}`;
    }

    // ── Meal log block (last 3 days) ────────────────────────────────────────
    let mealLogBlock = 'RECENT MEAL LOGS: No data.';
    if (recentLogs?.length) {
      const logSummary = recentLogs
        .slice(0, 10)
        .map(
          (log) =>
            `  • ${log.custom_name || 'Meal'} — ${log.actual_calories} kcal` +
            (log.actual_protein ? `, protein ${log.actual_protein}g` : '') +
            (log.actual_carbs ? `, carbs ${log.actual_carbs}g` : '') +
            (log.actual_fat ? `, fat ${log.actual_fat}g` : '') +
            (log.deviation_flag ? ' ⚠️ [off-plan]' : '')
        )
        .join('\n');

      const totalCalories = recentLogs.reduce((sum, l) => sum + (l.actual_calories || 0), 0);
      const totalProtein = recentLogs.reduce((sum, l) => sum + (l.actual_protein || 0), 0);
      const totalCarbs = recentLogs.reduce((sum, l) => sum + (l.actual_carbs || 0), 0);
      const totalFat = recentLogs.reduce((sum, l) => sum + (l.actual_fat || 0), 0);

      mealLogBlock = `MEAL LOGS PAST ${MEAL_LOG_DAYS} DAYS (${recentLogs.length} meals — Total: ${totalCalories} kcal | Protein: ${totalProtein.toFixed(0)}g | Carbs: ${totalCarbs.toFixed(0)}g | Fat: ${totalFat.toFixed(0)}g):
${logSummary}`;
    }

    // ── Active meal plan block ──────────────────────────────────────────────
    let mealPlanBlock = 'CURRENT MEAL PLAN: No active plan.';
    if (activeMealPlan?.items?.length) {
      const planSummary = activeMealPlan.items
        .slice(0, 10)
        .map((item) => {
          const recipeName = item.recipe_id?.name || 'AI Recipe';
          return `  • [${item.meal_type || 'Meal'}] ${recipeName}` +
            (item.target_calories ? ` — target ${item.target_calories} kcal` : '');
        })
        .join('\n');
      mealPlanBlock = `CURRENT MEAL PLAN (${activeMealPlan.items.length} meals):
${planSummary}`;
    }

    // ── Nutrition assessment block ──────────────────────────────────────────
    let assessmentBlock = 'NUTRITIONIST ASSESSMENT: No assessment available.';
    if (nutritionAssessment) {
      const by = nutritionAssessment.nutritionist_id?.full_name || 'Nutritionist';
      assessmentBlock = `NUTRITION ASSESSMENT FROM EXPERT (${by}):
- Diagnosis: ${this._sanitizeForPrompt(nutritionAssessment.diagnosis) || 'None'}
- Recommendations: ${this._sanitizeForPrompt(nutritionAssessment.recommendations) || 'None'}
- Notes: ${this._sanitizeForPrompt(nutritionAssessment.notes) || 'None'}`;
    }

    // ── Active contract block ───────────────────────────────────────────────
    let contractBlock = 'ASSIGNED NUTRITIONIST: The user currently has no active consultation contract.';
    if (activeContract?.nutritionist_id) {
      const n = activeContract.nutritionist_id;
      contractBlock = `ASSIGNED NUTRITIONIST:
- Name: ${n.full_name || 'Unknown'}
- Specialization: ${n.specialization || 'General Nutrition'}
(The user is currently in a consultation contract with this expert)`;
    }

    return `You are **NutriBot** — the personal AI nutrition assistant for the Wealthy Eater app.

**LANGUAGE RULE (HIGHEST PRIORITY):**
- Detect the language the user wrote in and ALWAYS reply in that exact same language.
- If the user writes in Vietnamese → reply in Vietnamese.
- If the user writes in English → reply in English.
- If the user writes in any other language → reply in that language.
- If the language cannot be determined → default to English.
- NEVER switch language mid-conversation unless the user switches first.

Your tasks:
1. Answer questions about nutrition, diets, and meal plans accurately and practically.
2. Provide personalized advice based on the user's actual health data provided below.
3. STRICTLY respect the ALLERGIES list — NEVER suggest any ingredient listed there.
4. ALWAYS follow the dietary guidelines associated with the user's MEDICAL CONDITION.
5. If the user asks about serious medical issues, advise them to consult a specialist doctor.
6. Keep answers detailed enough to be useful, easy to understand, practical, and friendly.

--- USER DATA (LIVE CONTEXT) ---

${profileBlock}

${weightTrendBlock}

${dietaryBlock}

${mealLogBlock}

${mealPlanBlock}

${assessmentBlock}

${contractBlock}

--- END OF DATA ---

Always rely on the data above to personalize your responses. If data is insufficient, answer based on general nutrition principles.`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE: Build Gemini Conversation History
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Converts our stored messages to Gemini's `contents` format.
   * Takes the last MAX_CONTEXT_TURNS messages to avoid token overflow.
   *
   * Gemini requires the first turn to be 'user', so we prepend the
   * system prompt as a user/model exchange before the real conversation.
   *
   * @param {Object[]} messages — session.messages array
   * @returns {Object[]} Gemini-compatible contents array
   */
  _buildConversationHistory(messages) {
    // Take the last N turns for context window management
    const contextMessages = messages.slice(-MAX_CONTEXT_TURNS);

    return contextMessages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE: Call Gemini API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Sends the conversation to Gemini and returns the assistant's reply text.
   *
   * @param {string}   systemPrompt     — The personalised instruction block
   * @param {Object[]} conversationTurns — Gemini contents[] format
   * @returns {Promise<string>}
   */
  async _callGemini(systemPrompt, conversationTurns) {
    const requestBody = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: conversationTurns, // systemInstruction handles context — no redundant prepend needed
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096, topP: 0.9 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    try {
      // Chatbot cascade favors fast reasoning (flash)
      const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
      const data = await geminiService.executeWithResilience(models, requestBody, { timeoutMs: 60000, maxRetriesPerModel: 3 });

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        throw new Error(`Empty response from Gemini.`);
      }
      return text;
    } catch (err) {
      console.error('[NutriBot] All models in cascade exhausted. Last error:', err.message);

      const isRateLimit = err.message?.includes('429');
      if (isRateLimit) {
        throw new AppError(
          'NutriBot is busy due to high traffic. Please try again in a few seconds.',
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }

      throw new AppError(
        'NutriBot is temporarily unavailable. Please try again later.',
        502,
        'GEMINI_API_ERROR'
      );
    }
  }
}

module.exports = new UserChatbotService();
