const jwt = require('jsonwebtoken');

/**
 * Generate a cryptographically signed JSON Web Token
 * @param {Object} user - User document containing _id and role
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    secret,
    {
      expiresIn: '7d'
    }
  );
};

module.exports = generateToken;

