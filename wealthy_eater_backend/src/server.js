/**
 * server.js — Application entry point.
 *
 * Responsibilities:
 *  1. Connect to MongoDB
 *  2. Start the HTTP server
 *
 * All Express configuration lives in src/app.js so it can be
 * imported independently by test runners without starting the server.
 */

const app            = require('./app');
const connectDatabase = require('./config/database');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function bootstrap() {
  // Connect to MongoDB first — crash fast if DB is unavailable
  await connectDatabase();

  const server = app.listen(PORT, () => {
    console.log(`✔ Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────────
  // Allows in-flight requests to complete before the process exits.

  function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully…`);
    server.close(() => {
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
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Catch unhandled promise rejections and uncaught exceptions
  process.on('unhandledRejection', (reason) => {
    console.error('[UnhandledRejection]', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[UncaughtException]', err);
    process.exit(1);
  });
}

bootstrap();