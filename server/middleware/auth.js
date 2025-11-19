const authService = require('../services/authService');

/**
 * Middleware to authenticate requests using JWT token
 * Extracts token from Authorization header, verifies it, and attaches user info to req.user
 * Returns 401 if token is missing or invalid
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No token provided' 
      });
    }

    // Verify token
    const decoded = await authService.verifyToken(token);

    // Attach user information to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    // Handle token verification errors
    if (error.message === 'Token has expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.' 
      });
    } else if (error.message === 'Invalid token') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication token is invalid' 
      });
    }

    // Generic error
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate the request but doesn't fail if no token is provided
 * Useful for routes that work with or without authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    // If no token, continue without authentication
    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token if present
    const decoded = await authService.verifyToken(token);

    // Attach user information to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    // If token verification fails, continue without authentication
    // This allows the route to handle unauthenticated requests
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
