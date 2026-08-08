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

// ▸ Multi-model cascade: khi model đầu bị 503/429, tự động chuyển sang model tiếp theo
// trong cùng 1 request — người dùng không bị gián đoạn.
//
// Danh sách models được xác minh từ tài liệu chính thức của Google (ai.google.dev/gemini-api/docs/models)
// Cập nhật lần cuối: 2026-08. Để kiểm tra lại, gọi:
//   GET https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY
//
// Thứ tự cascade:
//   Tầng 1 — gemini-3.6-flash : Stable, mới nhất, nhanh nhất, ít nghẽn nhất
//   Tầng 2 — gemini-3.5-flash : Stable, production-grade, hiệu suất rất tốt
//   Tầng 3 — gemini-3.5-flash-lite : Stable, siêu nhẹ, cực hiếm bị từ chối
const GEMINI_MODEL_CASCADE = [
  'gemini-3.6-flash',       // Tầng 1: Ưu tiên — Stable (2026)
  'gemini-3.5-flash',       // Tầng 2: Fallback — Stable (2026)
  'gemini-3.5-flash-lite',  // Tầng 3: Dự phòng — Stable, ultra-lightweight
];

const GEMINI_BASE_URL    = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_CONTEXT_TURNS  = 20;   // last 20 messages sent to Gemini (10 pairs)
const MAX_MESSAGES_PER_MINUTE = 10; // soft rate-limit per user
const MEAL_LOG_DAYS      = 3;    // how many recent days of logs to include
const MEAL_PLAN_DAYS     = 7;    // how many recent meal plan days to include

// ── Smart Key Management with Circuit Breaker ─────────────────────────────────
// Đọc nhiều key từ biến môi trường, phân tách bằng dấu phẩy.
// Ví dụ: GOOGLE_API_KEYS=key1,key2,key3
const rawKeys = process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || '';
const GEMINI_KEYS = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);

// Trạng thái sức khoẻ của từng key: { status, cooldownUntil, failCount }
// status: 'healthy' | 'rate_limited' | 'circuit_open'
const KEY_COOLDOWN_MS    = 60 * 1000;         // 60s sau khi bị 429
const CIRCUIT_BREAK_MS   = 5 * 60 * 1000;    // 5 phút khi lỗi liên tiếp >= 3 lần
const MAX_FAIL_COUNT     = 3;                 // số lần thất bại trước khi circuit open

/**
 * Bảng trạng thái key trong bộ nhớ.
 * Map<keyString, { status, cooldownUntil, failCount }>
 */
const _keyHealth = new Map();

function _getKeyHealth(key) {
  if (!_keyHealth.has(key)) {
    _keyHealth.set(key, { status: 'healthy', cooldownUntil: 0, failCount: 0 });
  }
  return _keyHealth.get(key);
}

/**
 * Đặt trạng thái key sau khi gặp lỗi.
 * @param {string} key
 * @param {429|503|number} statusCode
 */
function _markKeyFailed(key, statusCode) {
  const health = _getKeyHealth(key);
  health.failCount += 1;

  if (statusCode === 429) {
    health.status = 'rate_limited';
    health.cooldownUntil = Date.now() + KEY_COOLDOWN_MS;
    console.warn(`[NutriBot] Key ***${key.slice(-6)} marked rate_limited for ${KEY_COOLDOWN_MS / 1000}s.`);
  } else if (health.failCount >= MAX_FAIL_COUNT) {
    health.status = 'circuit_open';
    health.cooldownUntil = Date.now() + CIRCUIT_BREAK_MS;
    console.warn(`[NutriBot] Key ***${key.slice(-6)} circuit breaker OPEN for ${CIRCUIT_BREAK_MS / 60000} min.`);
  }
}

/** Đặt trạng thái key về healthy sau khi gọi thành công. */
function _markKeyHealthy(key) {
  const health = _getKeyHealth(key);
  health.status = 'healthy';
  health.failCount = 0;
  health.cooldownUntil = 0;
}

/**
 * Trả về một API key đang healthy. Xoay vòng qua danh sách,
 * tự động bỏ qua key đang trong trạng thái lỗi/cooldown.
 * @returns {string|null}
 */
function getHealthyKey() {
  if (GEMINI_KEYS.length === 0) return null;
  const now = Date.now();

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    const key = GEMINI_KEYS[i];
    const health = _getKeyHealth(key);

    // Tự động phục hồi key nếu cooldown đã hết
    if (health.status !== 'healthy' && now >= health.cooldownUntil) {
      health.status = 'healthy';
      health.failCount = 0;
      console.info(`[NutriBot] Key ***${key.slice(-6)} recovered — status reset to healthy.`);
    }

    if (health.status === 'healthy') return key;
  }

  return null; // Tất cả key đều đang trong trạng thái lỗi
}

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

    // ── Build Gemini contents (shared across all model attempts) ───────────────
    const hasHistory = conversationTurns.some((t) => t.role === 'model');

    let contents;
    if (!hasHistory && conversationTurns.length === 1) {
      // First message — prepend system bootstrap as user/model handshake
      contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
          role: 'model',
          parts: [{ text: 'Tôi đã hiểu đầy đủ thông tin của bạn. Tôi là NutriBot, sẵn sàng hỗ trợ bạn với mọi câu hỏi về dinh dưỡng và chế độ ăn uống!' }],
        },
        ...conversationTurns,
      ];
    } else {
      contents = conversationTurns;
    }

    const requestBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024, topP: 0.9 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    // ── Multi-Model Cascade ────────────────────────────────────────────────────
    // Thử lần lượt từng model trong cascade. Nếu model hiện tại trả về
    // 503 (overloaded) hoặc 429 (rate limit), chuyển sang model tiếp theo.
    // Chỉ throw lỗi ra ngoài khi TẤT CẢ model trong cascade đều thất bại.
    let lastError = null;

    for (const modelName of GEMINI_MODEL_CASCADE) {
      const apiUrl = `${GEMINI_BASE_URL}/${modelName}:generateContent`;
      const TIMEOUT_MS = 20000; // 20s — đủ thoải mái cho model pro

      // Với mỗi model, thử tối đa 2 lần với key khác nhau
      for (let attempt = 1; attempt <= 2; attempt++) {
        const apiKey = getHealthyKey();

        if (!apiKey) {
          // Tất cả key đang trong trạng thái lỗi — chờ một chút rồi tiếp
          console.warn('[NutriBot] No healthy API key available. Waiting 2s...');
          await new Promise((r) => setTimeout(r, 2000));
          break; // Bỏ qua model này, thử model tiếp theo
        }

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          console.info(`[NutriBot] Attempting model=${modelName}, key=***${apiKey.slice(-6)}, attempt=${attempt}`);

          const response = await fetch(`${apiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            const errorMsg  = `Gemini HTTP ${response.status} (${modelName}): ${errorText}`;

            if (response.status === 429) {
              _markKeyFailed(apiKey, 429);
              lastError = new Error(errorMsg);
              console.warn(`[NutriBot] ${errorMsg} — rotating key.`);
              // Thử lại ngay với key tiếp theo (không tăng model)
              continue;
            }

            if (response.status === 503 || response.status === 500) {
              // Model đang quá tải — đánh dấu thất bại nhẹ rồi thử model tiếp
              _markKeyFailed(apiKey, response.status);
              lastError = new Error(errorMsg);
              console.warn(`[NutriBot] ${errorMsg} — cascading to next model.`);
              break; // Thoát vòng attempt, chuyển sang model tiếp theo
            }

            // Lỗi khác (400, 401, ...) — không nên retry, throw ngay
            throw new Error(errorMsg);
          }

          // ✅ Response thành công
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

          if (!text) {
            throw new Error(`Empty response from Gemini (${modelName}).`);
          }

          // Đánh dấu key healthy sau khi thành công
          _markKeyHealthy(apiKey);
          console.info(`[NutriBot] Success with model=${modelName}, key=***${apiKey.slice(-6)}`);
          return text;

        } catch (err) {
          clearTimeout(timeoutId);
          lastError = err;

          if (err.name === 'AbortError') {
            console.warn(`[NutriBot] model=${modelName} timed out after ${TIMEOUT_MS / 1000}s.`);
            _markKeyFailed(apiKey, 'timeout');
            break; // Timeout = model chậm, thử model tiếp theo
          }

          // Lỗi nghiêm trọng không thể retry
          if (attempt === 2) break;

          // Chờ ngắn trước khi retry với key khác
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }

    // Tất cả model trong cascade đều thất bại
    console.error('[NutriBot] All models in cascade exhausted. Last error:', lastError?.message);

    // Phân biệt loại lỗi để trả message phù hợp cho user
    const isRateLimit = lastError?.message?.includes('429');
    if (isRateLimit) {
      throw new AppError(
        'NutriBot đang bận do lưu lượng cao. Vui lòng thử lại sau vài giây.',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    throw new AppError(
      'NutriBot tạm thời không khả dụng. Vui lòng thử lại sau.',
      502,
      'GEMINI_API_ERROR'
    );
  }
}

module.exports = new UserChatbotService();
