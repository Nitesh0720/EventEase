const { rateLimit } = require('express-rate-limit');

/**
 * EventEase Rate Limiting Middleware
 * File: backend/src/middleware/rateLimitMiddleware.js
 *
 * Implements targeted in-memory rate limiting to protect public endpoints
 * from automated brute-force attacks and enumeration.
 */

/**
 * Authentication Limiter
 * Applied exclusively to public authentication endpoints (/api/auth/login, /api/auth/register).
 * Maximum 10 requests per 15 minutes per IP address.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    });
  }
});

/**
 * Certificate Verification Limiter
 * Applied exclusively to the public certificate verification endpoint (/api/certificates/verify/:id).
 * Maximum 30 requests per 15 minutes per IP address.
 */
const certificateVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      valid: false,
      message: 'Too many certificate verification requests from this IP. Please try again after 15 minutes.'
    });
  }
});

/**
 * Factory helper for generating isolated rate limiters (useful for automated testing)
 */
const createRateLimiter = ({ windowMs = 60 * 1000, max = 5, message = 'Rate limit exceeded', customPayload = null }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    handler: (req, res, next, options) => {
      const payload = customPayload || { success: false, message };
      return res.status(options.statusCode).json(payload);
    }
  });
};

module.exports = {
  authLimiter,
  certificateVerificationLimiter,
  createRateLimiter
};

