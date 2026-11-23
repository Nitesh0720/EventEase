const crypto = require('crypto');

/**
 * Resolves and validates the QR signing secret from environment configuration.
 * Throws an explicit server configuration error if missing or empty.
 *
 * @returns {string} Validated secret key
 */
const getQrSecret = () => {
  const secret = process.env.QR_SECRET;
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    throw new Error('Server configuration error: QR_SECRET is missing or empty');
  }
  return secret.trim();
};

/**
 * Calculates a standard attendance expiration timestamp aligned with the event.
 * Sets expiry to 24 hours after the scheduled event end time to allow attendance auditing.
 *
 * @param {Object} event - Mongoose Event document or plain object
 * @returns {number} Expiration timestamp in seconds since Unix epoch
 */
const calculateEventExpiry = (event) => {
  const fallbackDurationDays = 7;
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (!event || !event.date) {
    return nowInSeconds + fallbackDurationDays * 24 * 3600;
  }

  const eventEndDateTime = new Date(event.date);

  if (event.endTime) {
    // Parse time formats like "17:00", "5:00 PM", or "05:00"
    const match = event.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3] ? match[3].toUpperCase() : null;

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      eventEndDateTime.setHours(hours, minutes, 0, 0);
    } else {
      eventEndDateTime.setHours(23, 59, 59, 999);
    }
  } else {
    eventEndDateTime.setHours(23, 59, 59, 999);
  }

  // Add 24-hour buffer after event conclusion for attendance auditing
  const expiryDate = new Date(eventEndDateTime.getTime() + 24 * 60 * 60 * 1000);
  const expSeconds = Math.floor(expiryDate.getTime() / 1000);

  // Guarantee exp is always in the future relative to issue time
  return Math.max(expSeconds, nowInSeconds + 3600);
};

/**
 * Generates a tamper-resistant, HMAC-SHA256 signed QR pass token.
 * Token format: v1.<Base64URL_Payload>.<HMAC_SHA256_Signature_Hex>
 *
 * @param {Object} params
 * @param {string} params.registrationId - MongoDB ObjectId string
 * @param {string} params.registrationCode - Unique registration code (e.g. REG-2026-XXXX-XXXX)
 * @param {string} params.eventId - MongoDB ObjectId string
 * @param {Object} [params.event] - Event object used to calculate attendance expiry
 * @param {number} [params.customExp] - Optional explicit expiry timestamp in seconds
 * @returns {string} Signed QR token string
 */
const generateQrToken = ({ registrationId, registrationCode, eventId, event, customExp }) => {
  const secret = getQrSecret();
  const now = Math.floor(Date.now() / 1000);
  const exp = customExp || calculateEventExpiry(event);

  const payload = {
    v: 1,
    rid: registrationId.toString(),
    rc: registrationCode.trim().toUpperCase(),
    eid: eventId.toString(),
    iat: now,
    exp
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`v1.${encodedPayload}`)
    .digest('hex');

  return `v1.${encodedPayload}.${signature}`;
};

/**
 * Verifies the integrity, signature, and expiration of a signed QR pass token.
 * Used by Module 6 tests and designed as the contract for Module 7 QR scanning.
 *
 * @param {string} token - The raw QR token string
 * @returns {{ valid: boolean, payload?: Object, error?: string }}
 */
const verifyQrToken = (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token string is missing or invalid' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token structure. Expected 3 segments' };
  }

  const [version, encodedPayload, signature] = parts;

  if (version !== 'v1') {
    return { valid: false, error: `Unsupported token version '${version}'` };
  }

  const secret = getQrSecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`v1.${encodedPayload}`)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: 'Tampered token signature. Verification failed' };
  }

  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (!payload.rid || !payload.rc || !payload.eid) {
      return { valid: false, error: 'Incomplete token payload identifiers' };
    }

    // Verify expiration timestamp
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return { valid: false, error: 'QR token has expired for this event' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Corrupt or unparseable payload' };
  }
};

module.exports = {
  calculateEventExpiry,
  generateQrToken,
  verifyQrToken
};

