const express = require('express');
const router = express.Router();
const {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  checkEventRegistration,
  getDigitalPass
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All registration routes require an authenticated user with 'Student' role
router.use(protect);
router.use(authorize('Student'));

// Student registration management
router.get('/my', getMyRegistrations);
router.get('/check/:eventId', checkEventRegistration);
router.get('/:registrationId/pass', getDigitalPass);
router.post('/:eventId', registerForEvent);
router.delete('/:registrationId', cancelRegistration);

module.exports = router;

