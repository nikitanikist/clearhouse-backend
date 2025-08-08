// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '8h' }
  );
};

// Login with role validation
const login = async (req, res) => {
  try {
    const { email, password, requestedRole } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Get user from database
    const result = await query(
      'SELECT id, email, password_hash, name, role, is_active, phone, department, bio, avatar FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found or invalid credentials',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Role validation
    console.log('DEBUG: Role validation check');
    console.log('DEBUG: requestedRole:', requestedRole);
    console.log('DEBUG: user.role:', user.role);
    console.log('DEBUG: requestedRole && user.role !== requestedRole:', requestedRole && user.role !== requestedRole);
    
    if (requestedRole && user.role !== requestedRole) {
      console.log('DEBUG: Role mismatch detected! Returning 403');
      return res.status(403).json({
        error: `You are not a ${requestedRole}, you are a ${user.role}`,
        code: 'ROLE_MISMATCH',
        actualRole: user.role,
        requestedRole: requestedRole
      });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    delete user.password_hash;

    logger.info(`User logged in: ${user.email} with role: ${user.role}`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        department: user.department || '',
        bio: user.bio || '',
        avatar: user.avatar || ''
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_FAILED'
    });
  }
};

// Logout (client-side will remove token)
const logout = async (req, res) => {
  try {
    // You can implement token blacklisting here if needed
    logger.info(`User logged out: ${req.user.email}`);
    
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_FAILED'
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    // Get full user data from database
    const result = await query(
      'SELECT id, email, name, role, phone, department, bio, avatar FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        department: user.department || '',
        bio: user.bio || '',
        avatar: user.avatar || ''
      }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to get user information',
      code: 'GET_USER_FAILED'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    // Get user's current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INCORRECT_PASSWORD'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    logger.info(`Password changed for user: ${req.user.email}`);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_FAILED'
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser,
  changePassword
};