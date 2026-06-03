/**
 * AppError — operational errors with an HTTP status code.
 *
 * Usage:
 *   throw new AppError('User not found', 404);
 *
 * The global error handler in app.js checks `err.isOperational` to decide
 * whether to expose the message to the client or return a generic 500.
 */
class AppError extends Error {
  /**
   * @param {string}  message     - Human-readable error message (sent to client).
   * @param {number}  statusCode  - HTTP status code (4xx for client, 5xx for server).
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;      // legacy alias — some code reads err.status
    this.isOperational = true;     // distinguishes expected errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
