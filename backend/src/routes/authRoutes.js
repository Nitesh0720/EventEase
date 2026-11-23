const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

// Public authentication routes (Rate limited to 10 requests per 15 minutes)
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);

// Protected user profile route
router.get('/profile', protect, getUserProfile);

module.exports = router;

