const express = require('express');
const router = express.Router();
const {
  recordAttendanceScan,
  recordAttendanceManual,
  getEventAttendance,
  getEventAttendanceStats,
  exportEventAttendanceCsv
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All attendance routes are strictly restricted to authenticated Administrators
router.use(protect);
router.use(authorize('Admin'));

// Check-in actions
router.post('/scan', recordAttendanceScan);
router.post('/manual', recordAttendanceManual);

// Event attendance queries, metrics, and CSV export
router.get('/event/:eventId', getEventAttendance);
router.get('/event/:eventId/stats', getEventAttendanceStats);
router.get('/event/:eventId/export', exportEventAttendanceCsv);

module.exports = router;

