// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No authentication token provided',
        code: 'NO_AUTH_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Attach user to request
    req.user = result.rows[0];
    req.token = token;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.email} to ${req.path}`);
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Check if user can access a specific form
const authorizeFormAccess = async (req, res, next) => {
  try {
    const formId = req.params.id || req.params.formId;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admins and superadmins can access all forms
    if (['admin', 'superadmin'].includes(userRole)) {
      return next();
    }

    // Check if preparer owns the form
    const result = await query(
      'SELECT created_by FROM forms WHERE id = $1',
      [formId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Form not found',
        code: 'FORM_NOT_FOUND'
      });
    }

    if (result.rows[0].created_by !== userId) {
      return res.status(403).json({
        error: 'You do not have permission to access this form',
        code: 'FORM_ACCESS_DENIED'
      });
    }

    next();
  } catch (error) {
    logger.error('Form authorization error:', error);
    res.status(500).json({
      error: 'Authorization check failed',
      code: 'AUTH_CHECK_FAILED'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query(
        'SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
        req.token = token;
      }
    }
  } catch (error) {
    // Don't fail, just continue without user
    logger.debug('Optional auth failed:', error.message);
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeFormAccess,
  optionalAuth
};