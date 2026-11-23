const express = require('express');
const router = express.Router();
const {
  generateIndividualCertificate,
  generateBulkCertificates,
  getEventCertificates,
  getMyCertificates,
  downloadCertificatePdf,
  verifyCertificatePublic
} = require('../controllers/certificateController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { certificateVerificationLimiter } = require('../middleware/rateLimitMiddleware');

// Public route: verify certificate authenticity (Rate limited to 30 requests per 15 minutes)
router.get('/verify/:certificateId', certificateVerificationLimiter, verifyCertificatePublic);

// Student route: view personal earned certificates
router.get('/my-certificates', protect, authorize('Student'), getMyCertificates);

// Dual-role route: download certificate PDF (Admin or owning Student)
router.get('/:id/download', protect, downloadCertificatePdf);

// Admin routes: individual and bulk issuance, event certificate roster
router.post('/generate', protect, authorize('Admin'), generateIndividualCertificate);
router.post('/generate-bulk', protect, authorize('Admin'), generateBulkCertificates);
router.get('/event/:eventId', protect, authorize('Admin'), getEventCertificates);

module.exports = router;

