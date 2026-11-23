const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Optional authentication middleware
 * Checks if Authorization header is present; if valid, populates req.user.
 * If not present or invalid, proceeds without failing so public endpoints
 * can provide tailored responses for Admins vs. Guests/Students.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }
  next();
};

module.exports = {
  optionalAuth
};

