// src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/user', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;