const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /auth/register - Register new user
router.post('/register', authController.register);

// POST /auth/login - Login user
router.post('/login', authController.login);

// GET /auth/me - Get current user profile (requires authentication)
router.get('/me', authenticateToken, authController.getCurrentUser);

// POST /auth/logout - Logout user (client-side token removal)
router.post('/logout', authController.logout);

// PUT /auth/password - Change password (requires authentication)
router.put('/password', authenticateToken, authController.changePassword);

module.exports = router;
