const crypto = require('crypto');

/**
 * Generates a cryptographically secure uppercase alphanumeric registration code.
 * Format: REG-YYYY-XXXX-XXXX
 * Example: REG-2026-9E4B-82FA
 */
const generateRegistrationCode = () => {
  const year = new Date().getFullYear();
  const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  const part1 = randomBytes.slice(0, 4);
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `REG-${year}-${part1}-${part2}`;
};

module.exports = {
  generateRegistrationCode
};
