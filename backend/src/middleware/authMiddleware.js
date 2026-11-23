const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes and verify JWT authentication
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Access token is required'
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET missing'
      });
    }

    const decoded = jwt.verify(token, secret);

    // Fetch user without password
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Error]', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token is invalid or expired'
    });
  }
};

/**
 * Middleware to restrict access based on user role
 * @param  {...string} roles - Allowed roles (e.g. 'Admin', 'Student')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${roles.join(' or ')} accounts`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};

