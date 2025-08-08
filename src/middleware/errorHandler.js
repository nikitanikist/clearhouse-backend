// src/middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error handler caught:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.email
  });

  // Default error
  let error = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  };
  let statusCode = 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    error = {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.details || err.message
    };
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    error = {
      error: 'Unauthorized',
      code: 'UNAUTHORIZED'
    };
  } else if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    error = {
      error: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY',
      details: 'A record with this value already exists'
    };
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    error = {
      error: 'Invalid reference',
      code: 'INVALID_REFERENCE',
      details: 'Referenced record does not exist'
    };
  } else if (err.code === 'ENOENT') { // File not found
    statusCode = 404;
    error = {
      error: 'File not found',
      code: 'FILE_NOT_FOUND'
    };
  }

  // Send error response
  res.status(statusCode).json(error);
};

module.exports = errorHandler;