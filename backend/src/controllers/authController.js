const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * Register a new Student account
 * POST /api/auth/register
 * Public route
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, department, year } = req.body;

    // Validate required fields
    if (!name || !email || !password || !department || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, department, and year'
      });
    }

    // Enforce minimum password length of 8 characters
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Normalize email (lowercase and trimmed)
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    // Security Rule: Public registration always creates Student accounts
    // Any role parameter supplied in request body is strictly ignored
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      department: department.trim(),
      year: year.trim(),
      role: 'Student'
    });

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        year: user.year,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('[Register Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration'
    });
  }
};

/**
 * Authenticate user and return JWT token
 * POST /api/auth/login
 * Public route
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare passwords using bcrypt
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        year: user.year,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('[Login Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login'
    });
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/profile
 * Protected route
 */
const getUserProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile
};

