/**
 * server.js — Application entry point.
 *
 * Responsibilities:
 *  1. Connect to MongoDB
 *  2. Wrap Express app in an http.Server (required for Socket.IO)
 *  3. Initialise Socket.IO and attach it to the http.Server
 *  4. Serve the uploads/ directory as static files for chat images
 *  5. Start listening
 */

const http = require('http');
const path = require('path');
const express = require('express');
const app = require('./app');
const connectDatabase = require('./config/database');
const { initSocketIO } = require('./config/socket.config');

const PORT = parseInt(process.env.PORT || '5000', 10);

// (Static files are now served in app.js)

async function bootstrap() {
  // 1. Connect to MongoDB first — crash fast if DB is unavailable
  await connectDatabase();

  // 2. Wrap Express in a native http.Server so Socket.IO can share the port
  const httpServer = http.createServer(app);

  // 3. Initialise Socket.IO (JWT auth + event handlers)
  const io = initSocketIO(httpServer);

  // 4. Store `io` on the Express app so HTTP controllers can emit events
  //    Usage in controllers: const io = req.app.get('io');
  app.set('io', io);

  // 5. Start listening
  httpServer.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development';
    console.log(`\n\x1b[32m✔ Server started successfully\x1b[0m`);
    console.log(`\x1b[36m  - URL:\x1b[0m      http://localhost:${PORT}`);
    console.log(`\x1b[36m  - Env:\x1b[0m      ${env}`);
    console.log(`\x1b[36m  - Socket:\x1b[0m   Port ${PORT}`);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────────
  function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully…`);
    httpServer.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force-exit after 10 seconds if requests do not drain
    setTimeout(() => {
      console.error('Forced exit after timeout.');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[UnhandledRejection]', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[UncaughtException]', err);
    process.exit(1);
  });
}

bootstrap();