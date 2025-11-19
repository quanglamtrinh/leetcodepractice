const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const pool = require('../config/database');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

class AuthService {
  /**
   * Register a new user
   * @param {string} email - User's email address
   * @param {string} username - User's username
   * @param {string} password - User's password (plain text)
   * @returns {Promise<{userId: number, email: string, username: string}>}
   */
  async registerUser(email, username, password) {
    // Validate email format
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password length
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Validate username
    if (!username || username.trim().length === 0) {
      throw new Error('Username is required');
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, username, created_at`,
      [email.toLowerCase(), username.trim(), passwordHash]
    );

    const user = result.rows[0];

    return {
      userId: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.created_at
    };
  }

  /**
   * Login user with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password (plain text)
   * @returns {Promise<{token: string, user: object}>}
   */
  async loginUser(email, password) {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user by email
    const result = await pool.query(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await this.comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last_login timestamp
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    };
  }

  /**
   * Generate JWT token
   * @param {number} userId - User's ID
   * @param {string} email - User's email
   * @returns {string} JWT token
   */
  generateToken(userId, email) {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Promise<{userId: number, email: string}>}
   */
  async verifyToken(token) {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare plain text password with hashed password
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

module.exports = new AuthService();
