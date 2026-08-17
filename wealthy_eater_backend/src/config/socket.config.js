/**
 * socket.config.js — Socket.IO server bootstrap for the Wealthy Eater chat.
 *
 * Responsibilities:
 *  1. Attach Socket.IO to the HTTP server.
 *  2. Authenticate every socket connection using the JWT from the handshake.
 *  3. Scope each socket to a private room keyed by `contract_id`.
 *  4. Relay `send_message` events to the room after persisting to MongoDB.
 *  5. Relay `mark_read` events after updating the DB.
 *
 * Event contract (bidirectional):
 *
 *  CLIENT → SERVER              SERVER → CLIENT
 *  ─────────────────────────    ─────────────────────────
 *  join_room  { contract_id }   new_message  <MessageObj>
 *  send_message { contract_id, messages_read { contract_id, reader_id }
 *               content, type } error { code, message }
 *  mark_read  { contract_id }
 *  disconnect
 */

require('dotenv').config({ quiet: true });

const { Server }   = require('socket.io');
const jwt          = require('jsonwebtoken');
const { JWT_ACCESS_SECRET } = require('../utils/jwt');
const chatService  = require('../services/chat.service');

/**
 * Initialise Socket.IO on the given HTTP server.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server} The Socket.IO server instance
 */
function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      // Mirror the same CORS policy as the Express app
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          origin === 'http://10.0.2.2:5000'
        ) {
          return callback(null, true);
        }
        const allowed = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim());
        if (allowed.includes('*') || allowed.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Socket.IO CORS blocked: ${origin}`));
      },
      credentials: true,
    },
    // Use websocket first, fall back to polling
    transports: ['websocket', 'polling'],
  });

  // ── Authentication Middleware ─────────────────────────────────────────────
  // Runs once per socket connection before any event is received.
  io.use((socket, next) => {
    // Token can be in handshake auth object or as a query param (mobile fallback)
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token missing.'));
    }

    try {
      const payload = jwt.verify(token, JWT_ACCESS_SECRET);
      socket.data.userId = payload.id || payload.sub || payload.userId;
      socket.data.role   = payload.role || 'customer';
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  // ── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`[Socket.IO] Client connected: socketId=${socket.id}, userId=${userId}`);
    
    // Automatically join the socket to a room identical to their userId for personal notifications
    if (userId) {
      socket.join(userId.toString());
    }

    // Rate limiter state per connection
    let lastMessageTime = 0;
    // ==============================================================================
    // 🆕 UC55: CLIENT LISTEN FOR CRIMSON DEVIATION ALERTS
    // Mobile client kích hoạt sự kiện này ngay khi login để lắng nghe kênh thông báo đỏ
    // ==============================================================================
    socket.on('join_alert_room', () => {
      const roomName = `user_alert_${userId}`;
      socket.join(roomName);
      console.log(`[UC55 Socket.io] Client Mobile userId=${userId} đã tham gia thành công phòng: ${roomName}`);
    });

    // ── join_room ──────────────────────────────────────────────────────────
    // Client joins a private room scoped to their consultation contract.
    socket.on('join_room', async ({ contract_id } = {}) => {
      if (!contract_id) {
        return socket.emit('error', { code: 'MISSING_CONTRACT_ID', message: 'contract_id is required.' });
      }

      try {
        // Validate the caller belongs to this contract before joining
        await chatService.assertContractAccess(contract_id, userId);

        await socket.join(contract_id);
        console.log(`[Socket.IO] userId=${userId} joined room=${contract_id}`);

        // Confirm join to the caller
        socket.emit('room_joined', { contract_id });
      } catch (err) {
        console.error(`[Socket.IO] join_room failed for userId=${userId}:`, err.message);
        socket.emit('error', {
          code:    err.statusCode === 403 ? 'FORBIDDEN' : 'JOIN_FAILED',
          message: err.message || 'Failed to join room.',
        });
      }
    });

    // ── send_message ───────────────────────────────────────────────────────
    // Client sends a text message; we persist it, then broadcast to the room.
    socket.on('send_message', async ({ contract_id, content, type } = {}, ack) => {
      // Spam prevention: Limit to 1 message per second
      const now = Date.now();
      if (now - lastMessageTime < 1000) {
        const errPayload = { code: 'RATE_LIMIT_EXCEEDED', message: 'Please slow down. You are sending messages too fast.' };
        if (typeof ack === 'function') ack({ success: false, error: errPayload });
        return socket.emit('error', errPayload);
      }
      lastMessageTime = now;

      if (!contract_id || !content) {
        const errPayload = { code: 'VALIDATION_ERROR', message: 'contract_id and content are required.' };
        if (typeof ack === 'function') ack({ success: false, error: errPayload });
        return socket.emit('error', errPayload);
      }

      // Only text type is supported via socket. Images go through HTTP upload.
      if (type && type !== 'text') {
        const errPayload = { code: 'UNSUPPORTED_TYPE', message: 'Send images via the HTTP /messages/image endpoint.' };
        if (typeof ack === 'function') ack({ success: false, error: errPayload });
        return socket.emit('error', errPayload);
      }

      try {
        const message = await chatService.saveTextMessage(contract_id, userId, content);
        // Broadcast to ALL clients in the room (including sender for echo confirmation)
        io.to(contract_id).emit('new_message', message);
        if (typeof ack === 'function') ack({ success: true, data: message });
      } catch (err) {
        console.error(`[Socket.IO] send_message failed userId=${userId}:`, err.message);
        const errPayload = {
          code:    err.statusCode === 403 ? 'FORBIDDEN' : 'SEND_FAILED',
          message: err.message || 'Failed to send message.',
        };
        if (typeof ack === 'function') ack({ success: false, error: errPayload });
        socket.emit('error', errPayload);
      }
    });

    // ── mark_read ─────────────────────────────────────────────────────────
    // Client notifies server they have read messages.
    socket.on('mark_read', async ({ contract_id } = {}) => {
      if (!contract_id) return;

      try {
        await chatService.markMessagesRead(contract_id, userId);
        // Notify all parties in the room (the sender will update their read ticks)
        io.to(contract_id).emit('messages_read', {
          contract_id,
          reader_id: userId,
        });
      } catch (err) {
        console.error(`[Socket.IO] mark_read failed userId=${userId}:`, err.message);
        // Non-critical — silently fail
      }
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: socketId=${socket.id}, reason=${reason}`);
    });
  });

  return io;
}

module.exports = { initSocketIO };
