const authService = require('../services/authService');
const pool = require('../config/database');

/**
 * Register a new user
 * POST /auth/register
 */
const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, username, and password are required'
      });
    }

    // Register user using auth service
    const result = await authService.registerUser(email, username, password);

    // Generate token for auto-login
    const token = authService.generateToken(result.userId, result.email);

    res.status(201).json({
      message: 'User registered successfully',
      token: token,
      user: {
        id: result.userId,
        email: result.email,
        username: result.username
      }
    });
  } catch (error) {
    // Handle specific errors
    if (error.message === 'Invalid email format') {
      return res.status(400).json({
        error: 'Invalid email format',
        message: error.message
      });
    }

    if (error.message === 'Password must be at least 8 characters') {
      return res.status(400).json({
        error: 'Weak password',
        message: error.message
      });
    }

    if (error.message === 'Email already registered') {
      return res.status(409).json({
        error: 'Email already exists',
        message: error.message
      });
    }

    if (error.message === 'Username is required') {
      return res.status(400).json({
        error: 'Invalid username',
        message: error.message
      });
    }

    // Generic error
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
};

/**
 * Login user
 * POST /auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Login user using auth service
    const result = await authService.loginUser(email, password);

    res.status(200).json({
      token: result.token,
      user: result.user
    });
  } catch (error) {
    // Handle specific errors
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: error.message
      });
    }

    if (error.message === 'Email and password are required') {
      return res.status(400).json({
        error: 'Missing required fields',
        message: error.message
      });
    }

    // Generic error
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
};

/**
 * Get current user profile
 * GET /auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    // User info is already attached by authenticateToken middleware
    const userId = req.user.userId;

    // Fetch full user profile from database
    const result = await pool.query(
      'SELECT id, email, username, created_at, last_login FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    const user = result.rows[0];

    res.status(200).json({
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.created_at,
      lastLogin: user.last_login
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: 'An error occurred while fetching user profile'
    });
  }
};

/**
 * Logout user (client-side token removal)
 * POST /auth/logout
 */
const logout = async (req, res) => {
  try {
    // Since we're using JWT, logout is handled client-side by removing the token
    // This endpoint exists for consistency and future enhancements (e.g., token blacklisting)
    
    res.status(200).json({
      message: 'Logout successful',
      note: 'Please remove the token from client storage'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
};

/**
 * Change user password
 * PUT /auth/password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Current password and new password are required'
      });
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'New password must be at least 8 characters'
      });
    }

    // Fetch user's current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Verify current password
    const isPasswordValid = await authService.comparePassword(
      currentPassword,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await authService.hashPassword(newPassword);

    // Update password in database
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while changing password'
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  changePassword
};
