const QRCode = require('qrcode');

/**
 * Generates a PNG Data URL from input text (e.g. signed QR token).
 * Format: data:image/png;base64,...
 *
 * @param {string} text - Token string to encode in QR matrix
 * @returns {Promise<string>} Base64 Data URL
 */
const generateQrDataUrl = async (text) => {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 320,
    color: {
      dark: '#0f172a', // Navy tone matching EventEase design system
      light: '#ffffff'
    }
  });
};

/**
 * Generates a PNG binary Buffer from input text.
 * Suitable for CID email attachments.
 *
 * @param {string} text - Token string to encode in QR matrix
 * @returns {Promise<Buffer>} PNG binary Buffer
 */
const generateQrBuffer = async (text) => {
  return QRCode.toBuffer(text, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    width: 320,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
};

module.exports = {
  generateQrDataUrl,
  generateQrBuffer
};

