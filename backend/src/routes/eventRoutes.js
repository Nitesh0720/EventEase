const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { optionalAuth } = require('../middleware/optionalAuth');

// Public / Context-Aware Read Routes
// optionalAuth detects if requester is an Admin or Public/Student
router.get('/', optionalAuth, getEvents);
router.get('/:id', optionalAuth, getEventById);

// Admin-Only Event Management Routes
router.post('/', protect, authorize('Admin'), createEvent);
router.put('/:id', protect, authorize('Admin'), updateEvent);
router.patch('/:id/status', protect, authorize('Admin'), updateEventStatus);
router.delete('/:id', protect, authorize('Admin'), deleteEvent);

module.exports = router;

