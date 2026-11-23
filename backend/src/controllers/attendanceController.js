const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const { Event } = require('../models/Event');
const { verifyQrToken, calculateEventExpiry } = require('../utils/qrToken');

/**
 * Combines date input with time string (e.g. "09:30 AM" or "14:00")
 * Consistent with eventController.js date/time handling.
 */
const parseDateTime = (dateInput, timeStr) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  if (!timeStr) return d;

  const regex = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i;
  const match = timeStr.trim().match(regex);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3] ? match[3].toUpperCase() : null;

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    d.setHours(hours, minutes, 0, 0);
  }
  return d;
};

/**
 * Validates that an event is in a state and attendance window eligible for check-in.
 * Shared by both QR scan check-in and manual code check-in.
 *
 * @param {Object} event - Event document
 * @returns {{ valid: boolean, status?: number, message?: string }}
 */
const validateEventForAttendance = (event) => {
  if (!event) {
    return { valid: false, status: 404, message: 'Event not found' };
  }

  if (event.status === 'Cancelled') {
    return { valid: false, status: 400, message: 'Cannot record attendance for a cancelled event' };
  }

  if (event.status !== 'Published') {
    return {
      valid: false,
      status: 400,
      message: `Cannot record attendance for an event with status '${event.status}'. Event must be Published`
    };
  }

  const now = new Date();

  // Check-in window opens at the event's scheduled start time
  const startDateTime = parseDateTime(event.date, event.startTime);
  if (startDateTime && now < startDateTime) {
    return {
      valid: false,
      status: 400,
      message: `Attendance check-in has not opened yet. Check-in opens at scheduled start time (${event.startTime}) on ${startDateTime.toLocaleDateString()}`
    };
  }

  // Check-in window closes at the QR token's exp timestamp (event end time + grace buffer)
  const expSeconds = calculateEventExpiry(event);
  const expiryDate = new Date(expSeconds * 1000);
  if (now > expiryDate) {
    return {
      valid: false,
      status: 400,
      message: `Attendance check-in period has expired for this event (closed at ${expiryDate.toLocaleString()})`
    };
  }

  return { valid: true };
};

/**
 * Record attendance via QR token scan
 * POST /api/attendance/scan
 * Private (Admin only)
 */
const recordAttendanceScan = async (req, res) => {
  const { eventId, token } = req.body;

  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing event identifier' });
  }

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Scanned QR token is required' });
  }

  try {
    // Step 1: Cryptographic signature and token expiration verification
    const tokenVerification = verifyQrToken(token);
    if (!tokenVerification.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid QR pass: ${tokenVerification.error}`
      });
    }

    const { rid, rc, eid } = tokenVerification.payload;

    // Step 2: Validate token event scope
    if (eid !== eventId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'QR pass was issued for a different event. Access denied'
      });
    }

    // Step 3: Event state and attendance window validation
    const event = await Event.findById(eventId);
    const eventValidation = validateEventForAttendance(event);
    if (!eventValidation.valid) {
      return res.status(eventValidation.status).json({
        success: false,
        message: eventValidation.message
      });
    }

    // Step 4: Independent Registration lookup and validation
    const registration = await Registration.findById(rid).populate('student', 'name email department year');
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration record not found' });
    }

    if (registration.registrationCode !== rc) {
      return res.status(400).json({ success: false, message: 'Registration code mismatch' });
    }

    if (registration.event.toString() !== eventId.toString()) {
      return res.status(400).json({ success: false, message: 'Registration does not match the active event' });
    }

    if (registration.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: `Registration status is '${registration.status}'. Only confirmed registrations may check in`
      });
    }

    // Step 5: Duplicate check-in check
    const existing = await Attendance.findOne({ registration: rid }).populate('student', 'name email');
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Student ${registration.student?.name} is already checked in for this event (checked in at ${new Date(existing.checkInTime).toLocaleTimeString()})`,
        data: {
          attendance: existing,
          alreadyCheckedIn: true
        }
      });
    }

    // Step 6: Create attendance document with race-condition error handling
    try {
      const attendance = await Attendance.create({
        registration: registration._id,
        student: registration.student._id,
        event: event._id,
        checkInTime: new Date(),
        markedBy: req.user._id,
        method: 'QR_SCAN'
      });

      const populated = await Attendance.findById(attendance._id)
        .populate('student', 'name email department year')
        .populate('registration', 'registrationCode registeredAt')
        .populate('markedBy', 'name');

      return res.status(201).json({
        success: true,
        message: `Attendance verified successfully for ${registration.student?.name}`,
        data: populated
      });
    } catch (createErr) {
      // Catch MongoDB duplicate key error E11000 for concurrent scan requests
      if (createErr.code === 11000) {
        return res.status(409).json({
          success: false,
          message: `Student ${registration.student?.name} is already checked in for this event (concurrent duplicate check-in prevented)`
        });
      }
      throw createErr;
    }
  } catch (error) {
    console.error('Error recording QR scan attendance:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while verifying QR attendance'
    });
  }
};

/**
 * Record attendance via manual registration code fallback
 * POST /api/attendance/manual
 * Private (Admin only)
 */
const recordAttendanceManual = async (req, res) => {
  const { eventId, registrationCode } = req.body;

  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing event identifier' });
  }

  if (!registrationCode || typeof registrationCode !== 'string') {
    return res.status(400).json({ success: false, message: 'Registration code is required' });
  }

  // Normalize code to uppercase
  const normalizedCode = registrationCode.trim().toUpperCase();

  // Validate format (e.g. REG-YYYY-XXXX-XXXX)
  const codeRegex = /^REG-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!codeRegex.test(normalizedCode)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid registration code format. Expected format: REG-YYYY-XXXX-XXXX'
    });
  }

  try {
    // Step 1: Validate event state and attendance window (identical rules to QR scan)
    const event = await Event.findById(eventId);
    const eventValidation = validateEventForAttendance(event);
    if (!eventValidation.valid) {
      return res.status(eventValidation.status).json({
        success: false,
        message: eventValidation.message
      });
    }

    // Step 2: Find registration matching code and event
    const registration = await Registration.findOne({
      event: eventId,
      registrationCode: normalizedCode
    }).populate('student', 'name email department year');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: `No registration found matching code '${normalizedCode}' for this event`
      });
    }

    // Step 3: Verify registration status is Confirmed
    if (registration.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: `Registration status is '${registration.status}'. Only confirmed registrations may check in`
      });
    }

    // Step 4: Duplicate check-in verification
    const existing = await Attendance.findOne({ registration: registration._id }).populate('student', 'name email');
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Student ${registration.student?.name} is already checked in for this event (checked in at ${new Date(existing.checkInTime).toLocaleTimeString()})`,
        data: {
          attendance: existing,
          alreadyCheckedIn: true
        }
      });
    }

    // Step 5: Create attendance document with race-condition error handling
    try {
      const attendance = await Attendance.create({
        registration: registration._id,
        student: registration.student._id,
        event: event._id,
        checkInTime: new Date(),
        markedBy: req.user._id,
        method: 'MANUAL'
      });

      const populated = await Attendance.findById(attendance._id)
        .populate('student', 'name email department year')
        .populate('registration', 'registrationCode registeredAt')
        .populate('markedBy', 'name');

      return res.status(201).json({
        success: true,
        message: `Attendance verified successfully for ${registration.student?.name} (Manual Entry)`,
        data: populated
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        return res.status(409).json({
          success: false,
          message: `Student ${registration.student?.name} is already checked in for this event (concurrent duplicate check-in prevented)`
        });
      }
      throw createErr;
    }
  } catch (error) {
    console.error('Error recording manual attendance:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while recording manual attendance'
    });
  }
};

/**
 * Get all attendance records for a specific event
 * GET /api/attendance/event/:eventId
 * Private (Admin only)
 */
const getEventAttendance = async (req, res) => {
  const { eventId } = req.params;
  const { search } = req.query;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const records = await Attendance.find({ event: eventId })
      .populate('student', 'name email department year')
      .populate('registration', 'registrationCode registeredAt')
      .populate('markedBy', 'name email')
      .sort({ checkInTime: -1 });

    // Optional search filtering by student name, email, or registration code
    let filtered = records;
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = records.filter((r) => {
        const studentName = r.student?.name?.toLowerCase() || '';
        const studentEmail = r.student?.email?.toLowerCase() || '';
        const regCode = r.registration?.registrationCode?.toLowerCase() || '';
        const dept = r.student?.department?.toLowerCase() || '';
        return studentName.includes(q) || studentEmail.includes(q) || regCode.includes(q) || dept.includes(q);
      });
    }

    return res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('Error fetching event attendance:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance records'
    });
  }
};

/**
 * Get attendance statistics and counts for an event
 * GET /api/attendance/event/:eventId/stats
 * Private (Admin only)
 */
const getEventAttendanceStats = async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Count only confirmed registrations as registered attendees
    const totalRegistered = await Registration.countDocuments({
      event: eventId,
      status: 'Confirmed'
    });

    const totalPresent = await Attendance.countDocuments({ event: eventId });
    const totalAbsent = Math.max(0, totalRegistered - totalPresent);
    const attendanceRate = totalRegistered > 0 ? ((totalPresent / totalRegistered) * 100).toFixed(1) : '0.0';

    return res.status(200).json({
      success: true,
      data: {
        eventId: event._id,
        eventTitle: event.title,
        eventStatus: event.status,
        capacity: event.seatLimit || 0,
        totalRegistered,
        totalPresent,
        totalAbsent,
        attendanceRate
      }
    });
  } catch (error) {
    console.error('Error fetching event attendance stats:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute attendance statistics'
    });
  }
};

/**
 * Sanitize and escape a CSV cell value to prevent formula injection.
 * If value starts with =, +, -, or @, prefix with a single quote.
 */
const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();

  // Formula injection defense (DDE injection protection)
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Export event attendance roster as a CSV attachment
 * GET /api/attendance/event/:eventId/export
 * Private (Admin only)
 */
const exportEventAttendanceCsv = async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier' });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const records = await Attendance.find({ event: eventId })
      .populate('student', 'name email department year')
      .populate('registration', 'registrationCode registeredAt')
      .populate('markedBy', 'name')
      .sort({ checkInTime: 1 });

    const headers = [
      'Student Name',
      'Student Email',
      'Department',
      'Year',
      'Registration Code',
      'Check-In Date Time',
      'Verification Method',
      'Marked By Admin'
    ];

    const rows = records.map((r) => [
      sanitizeCsvCell(r.student?.name || 'N/A'),
      sanitizeCsvCell(r.student?.email || 'N/A'),
      sanitizeCsvCell(r.student?.department || 'N/A'),
      sanitizeCsvCell(r.student?.year || 'N/A'),
      sanitizeCsvCell(r.registration?.registrationCode || 'N/A'),
      sanitizeCsvCell(r.checkInTime ? new Date(r.checkInTime).toLocaleString() : 'N/A'),
      sanitizeCsvCell(r.method || 'QR_SCAN'),
      sanitizeCsvCell(r.markedBy?.name || 'Admin')
    ]);

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const safeTitle = (event.title || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `attendance_${safeTitle}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting attendance CSV:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to export attendance CSV'
    });
  }
};

module.exports = {
  recordAttendanceScan,
  recordAttendanceManual,
  getEventAttendance,
  getEventAttendanceStats,
  exportEventAttendanceCsv,
  parseDateTime,
  validateEventForAttendance
};

