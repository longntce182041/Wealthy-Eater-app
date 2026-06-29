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

const ChatbotSession  = require('../models/ChatbotSession');
const UserProfile     = require('../models/UserProfile');
const UserDietary     = require('../models/UserDietary');
const CustomerMealLog = require('../models/CustomerMealLog');
const ConsultationContract = require('../models/ConsultationContract');
const AppError        = require('../utils/AppError');

// ── Constants ─────────────────────────────────────────────────────────────────
const GEMINI_MODEL       = 'gemini-2.5-flash';
const GEMINI_API_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── Key Rotation & Rate Limiting ──────────────────────────────────────────────
// Read multiple keys if separated by comma, fallback to single key.
const rawKeys = process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || '';
const GEMINI_KEYS = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

function getNextGeminiKey() {
  if (GEMINI_KEYS.length === 0) return null;
  const key = GEMINI_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return key;
}
const MAX_CONTEXT_TURNS  = 20;   // last 20 messages sent to Gemini (10 pairs)
const MAX_MESSAGES_PER_MINUTE = 10; // soft rate-limit per user
const MEAL_LOG_DAYS      = 3;    // how many recent days of logs to include
const MEAL_PLAN_DAYS     = 7;    // how many recent meal plan days to include

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
        'Bạn cần hoàn thiện hồ sơ cá nhân trước khi sử dụng trợ lý AI.',
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
        `Bạn đang gửi quá nhiều tin nhắn. Vui lòng đợi một chút rồi thử lại.`,
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

    const [profile, dietary, recentLogs, activeContract] = await Promise.all([
      UserProfile.findOne({ user_id: userId }).lean(),
      UserDietary.findOne({ user_id: userId }).lean(),
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
    ]);

    return { profile, dietary, recentLogs, activeContract };
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
    const { profile, dietary, recentLogs, activeContract } = context;

    // ── Profile block ───────────────────────────────────────────────────────
    const profileBlock = profile
      ? `USER PROFILE:
- Full Name: ${this._sanitizeForPrompt(profile.full_name) || 'Not provided'}
- Age: ${profile.age || 'Unknown'} | Gender: ${profile.gender || 'Unknown'}
- Height: ${profile.height || '?'} cm | Weight: ${profile.weight || '?'} kg
- BMI: ${profile.bmi ? profile.bmi.toFixed(1) : 'Not calculated'} | BMR: ${profile.bmr ? Math.round(profile.bmr) : 'Not calculated'} kcal/day
- TDEE (Total Daily Energy Expenditure): ${profile.tdee ? Math.round(profile.tdee) : 'Not calculated'} kcal/day
- Health Goal: ${this._sanitizeForPrompt(profile.health_goal) || 'Not set'}`
      : 'USER PROFILE: User has not updated their profile.';

    // ── Dietary block ───────────────────────────────────────────────────────
    let dietaryBlock = 'DIETARY INFO: No data.';
    if (dietary) {
      const allergies = dietary.allergies?.length
        ? dietary.allergies.join(', ')
        : 'None';
      const dislikes = dietary.dislike_ingredients?.length
        ? dietary.dislike_ingredients.join(', ')
        : 'None';
      const preferences = dietary.diet_preferences?.length
        ? dietary.diet_preferences.join(', ')
        : 'Unknown';

      dietaryBlock = `DIETARY INFO:
- ⚠️ ALLERGIES (STRICT — DO NOT SUGGEST): ${allergies}
- Disliked Ingredients: ${dislikes}
- Diet Preferences: ${preferences}
- Cooking Skill Level: ${dietary.cooking_skill_level || 'Unknown'}
- Available Cooking Time: ${dietary.available_cooking_time ? dietary.available_cooking_time + ' minutes' : 'Unknown'}`;
    }

    // ── Meal log block (last 3 days) ────────────────────────────────────────
    let mealLogBlock = 'RECENT MEAL LOGS: No data.';
    if (recentLogs?.length) {
      const logSummary = recentLogs
        .slice(0, 8)
        .map(
          (log) =>
            `  • ${log.custom_name || 'Meal'} — ${log.actual_calories} kcal` +
            (log.actual_protein ? `, ${log.actual_protein}g protein` : '') +
            (log.deviation_flag ? ' ⚠️ [deviated from goal]' : '')
        )
        .join('\n');

      const totalCalories = recentLogs.reduce(
        (sum, l) => sum + (l.actual_calories || 0),
        0
      );
      mealLogBlock = `RECENT MEAL LOGS (Last ${MEAL_LOG_DAYS} days — ${recentLogs.length} meals, total ${totalCalories} kcal):
${logSummary}`;
    }

    // ── Active contract block ───────────────────────────────────────────────
    let contractBlock = 'NUTRITIONIST: The user currently has no active consultation contract.';
    if (activeContract?.nutritionist_id) {
      const n = activeContract.nutritionist_id;
      contractBlock = `ASSIGNED NUTRITIONIST:
- Name: ${n.full_name || 'Unknown'}
- Specialization: ${n.specialization || 'General Nutrition'}
(The user is currently in an active consultation contract)`;
    }

    return `You are **NutriBot** — the personal AI nutrition assistant for the Wealthy Eater app. You support bilingual communication (English and Vietnamese), but your primary language is English.
Your tasks are:
1. Answer questions about nutrition, diets, and meal plans accurately and practically.
2. Provide personalized advice based on the user's health profile and actual data.
3. Always respect the ALLERGIES list — DO NOT suggest any ingredients that are in the allergies list.
4. If the user asks about serious medical issues, advise them to consult a specialist doctor.
5. Keep answers concise, easy to understand, practical, and friendly. IMPORTANT: Default to English, but reply in the language the user asked in (English or Vietnamese).

--- USER DATA (ACTUAL UPDATES) ---

${profileBlock}

${dietaryBlock}

${mealLogBlock}

${contractBlock}

--- END OF DATA ---

Always rely on the above data to personalize your answers. If there is not enough data, answer based on general nutritional principles.`;
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
    if (GEMINI_KEYS.length === 0) {
      throw new AppError(
        'Gemini API key is not configured. Please contact the administrator.',
        502,
        'GEMINI_API_ERROR'
      );
    }

    // Gemini multi-turn: inject system context as the first user/model pair
    // if the conversation has no prior history (new session).
    const hasHistory = conversationTurns.some((t) => t.role === 'model');

    let contents;
    if (!hasHistory && conversationTurns.length === 1) {
      // First message — prepend system bootstrap as user/model handshake
      contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [
            {
              text:
                'Tôi đã hiểu đầy đủ thông tin của bạn. Tôi là NutriBot, sẵn sàng hỗ trợ bạn với mọi câu hỏi về dinh dưỡng và chế độ ăn uống!',
            },
          ],
        },
        ...conversationTurns,
      ];
    } else {
      // Continuing conversation — system context is already in first turns
      contents = conversationTurns;
    }

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.9,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };

    const MAX_RETRIES = 2;
    let lastError = null;
    let isRateLimited = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const apiKey = getNextGeminiKey();
        if (!apiKey) throw new Error('Missing Gemini API Key.');

        const response = await fetch(
          `${GEMINI_API_URL}?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 429) {
            isRateLimited = true;
            throw new Error(`Gemini HTTP 429: Too Many Requests`);
          }
          throw new Error(`Gemini HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!text) {
          throw new Error('Empty response from Gemini API.');
        }

        return text;
      } catch (err) {
        lastError = err;
        
        if (err.name === 'AbortError') {
          console.warn(`[NutriBot] Gemini attempt ${attempt} timed out after 15s.`);
        } else {
          console.warn(`[NutriBot] Gemini attempt ${attempt} failed: ${err.message}`);
        }

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 800)
          );
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    console.error('[NutriBot] All Gemini retries exhausted:', lastError?.message);

    if (isRateLimited) {
      throw new AppError(
        'NutriBot is currently busy due to high traffic. Please wait a few seconds and try again.',
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

module.exports = new UserChatbotService();
