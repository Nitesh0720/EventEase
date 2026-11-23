const crypto = require('crypto');

/**
 * Generates a cryptographically secure, unpredictable certificate ID.
 * Format: CERT-YYYY-XXXX-XXXX (e.g. CERT-2026-9E4B-82FA)
 * Uses crypto.randomBytes for high-entropy uniqueness.
 *
 * @returns {string} Unique uppercase certificate identifier
 */
const generateCertificateId = () => {
  const year = new Date().getFullYear();
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CERT-${year}-${part1}-${part2}`;
};

module.exports = {
  generateCertificateId
};

