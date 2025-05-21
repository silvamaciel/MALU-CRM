// backend/utils/errorResponse.js
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    // Adiciona a stack trace ao erro (útil para debug)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;