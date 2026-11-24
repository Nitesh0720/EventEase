const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const { Event } = require('../models/Event');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { generateCertificateId } = require('../utils/generateCertificateId');
const { generateCertificatePdf } = require('../utils/generateCertificatePdf');
const { queueCertificateEmailAsync } = require('../utils/sendEmail');

/**
 * Combines date input with time string (e.g. "09:30 AM" or "17:00")
 * Consistent with eventController.js and attendanceController.js date/time handling.
 *
 * @param {Date|string} dateInput - Date object or date string
 * @param {string} timeStr - Time string
 * @returns {Date|null}
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
 * Generate Individual Certificate for an Attended Student
 * POST /api/certificates/generate
 * Private (Admin only)
 */
const generateIndividualCertificate = async (req, res) => {
  const { eventId, studentId, sendEmail } = req.body;

  // Validate optional sendEmail parameter (must be strict boolean)
  if (sendEmail !== undefined && typeof sendEmail !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Invalid sendEmail option. Must be a boolean value (true or false)'
    });
  }
  const shouldSendEmail = Boolean(sendEmail);

  // Validation 1: ObjectId formats
  if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid event or student identifier format'
    });
  }

  try {
    // Validation 2 & 3: Event existence and status
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate certificates for a cancelled event'
      });
    }

    if (event.status !== 'Published') {
      return res.status(400).json({
        success: false,
        message: `Cannot generate certificates for an event with status '${event.status}'. Event must be Published`
      });
    }

    // Validation 4: Event scheduled end time must have passed
    const now = new Date();
    const eventEndDateTime = parseDateTime(event.date, event.endTime) || new Date(event.date);
    if (now < eventEndDateTime) {
      return res.status(400).json({
        success: false,
        message: `Cannot generate certificates before the event has concluded. Scheduled conclusion: ${eventEndDateTime.toLocaleString()}`
      });
    }

    // Validation 5: Student account existence and role
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found'
      });
    }

    if (student.role !== 'Student') {
      return res.status(400).json({
        success: false,
        message: 'Certificates can only be issued to accounts with the Student role'
      });
    }

    // Validation 6: Confirmed Registration existence
    const registration = await Registration.findOne({
      student: studentId,
      event: eventId
    });

    if (!registration) {
      return res.status(400).json({
        success: false,
        message: 'No registration found for this student and event'
      });
    }

    if (registration.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate certificate for a cancelled registration'
      });
    }

    // Validation 7 & 8: Attendance verification
    const attendance = await Attendance.findOne({
      registration: registration._id,
      student: studentId,
      event: eventId
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate certificate. Student has no verified attendance record for this event'
      });
    }

    // Validation 9: Prevent duplicate issuance
    const existingCertificate = await Certificate.findOne({
      $or: [
        { registration: registration._id },
        { event: eventId, student: studentId }
      ]
    });

    if (existingCertificate) {
      return res.status(409).json({
        success: false,
        message: 'A certificate has already been issued for this student and event',
        certificateId: existingCertificate.certificateId
      });
    }

    // Create Certificate record
    const certificateId = generateCertificateId();
    const certificate = await Certificate.create({
      certificateId,
      event: event._id,
      student: student._id,
      registration: registration._id,
      attendance: attendance._id,
      issuedAt: new Date(),
      issuedBy: req.user._id,
      status: 'Generated'
    });

    // Handle optional asynchronous email dispatch
    let emailStatus = 'not_requested';
    if (shouldSendEmail && student && student.email) {
      queueCertificateEmailAsync({
        student,
        event,
        certificate
      });
      emailStatus = 'queued';
    }

    return res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      certificate,
      emailStatus
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A certificate has already been issued for this attendee (duplicate prevented)'
      });
    }
    console.error('[Certificate Controller Error - generateIndividual]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate certificate'
    });
  }
};

/**
 * Generate Bulk Certificates for All Eligible Verified Attendees
 * POST /api/certificates/generate-bulk
 * Private (Admin only)
 */
const generateBulkCertificates = async (req, res) => {
  const { eventId, sendEmail } = req.body;

  // Validate optional sendEmail parameter (must be strict boolean)
  if (sendEmail !== undefined && typeof sendEmail !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Invalid sendEmail option. Must be a boolean value (true or false)'
    });
  }
  const shouldSendEmail = Boolean(sendEmail);

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid event identifier format'
    });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate certificates for a cancelled event'
      });
    }

    if (event.status !== 'Published') {
      return res.status(400).json({
        success: false,
        message: `Cannot generate certificates for an event with status '${event.status}'. Event must be Published`
      });
    }

    const now = new Date();
    const eventEndDateTime = parseDateTime(event.date, event.endTime) || new Date(event.date);
    if (now < eventEndDateTime) {
      return res.status(400).json({
        success: false,
        message: `Cannot generate certificates before the event has concluded. Scheduled conclusion: ${eventEndDateTime.toLocaleString()}`
      });
    }

    // Step 1: Query all confirmed registrations for this event
    const confirmedRegistrations = await Registration.find({
      event: eventId,
      status: 'Confirmed'
    }).select('_id student');

    const totalConfirmedRegistrations = confirmedRegistrations.length;
    const confirmedRegIdMap = new Map();
    confirmedRegistrations.forEach((reg) => {
      confirmedRegIdMap.set(reg._id.toString(), reg.student.toString());
    });

    // Step 2: Query attendance records corresponding to confirmed registrations
    const confirmedRegIds = Array.from(confirmedRegIdMap.keys());
    const attendanceRecords = await Attendance.find({
      event: eventId,
      registration: { $in: confirmedRegIds }
    })
      .select('_id registration student')
      .populate('student', 'name email department year');

    const totalVerifiedAttendees = attendanceRecords.length;

    // Step 3: Query already issued certificates for this event
    const existingCertificates = await Certificate.find({
      event: eventId
    }).select('registration student certificateId');

    const existingRegIdSet = new Set(existingCertificates.map((c) => c.registration.toString()));
    const existingStudentIdSet = new Set(existingCertificates.map((c) => c.student.toString()));

    let certificatesNewlyGenerated = 0;
    let certificatesAlreadyExisting = 0;
    let emailsQueuedCount = 0;
    const failedRecords = [];

    // Step 4: Issue certificates for eligible attendees lacking an existing certificate
    for (const att of attendanceRecords) {
      const studentDoc = att.student;
      const studentIdStr = studentDoc?._id ? studentDoc._id.toString() : att.student.toString();
      const regIdStr = att.registration.toString();

      if (existingRegIdSet.has(regIdStr) || existingStudentIdSet.has(studentIdStr)) {
        certificatesAlreadyExisting++;
        continue;
      }

      try {
        const certId = generateCertificateId();
        const newCert = await Certificate.create({
          certificateId: certId,
          event: event._id,
          student: studentDoc?._id || att.student,
          registration: att.registration,
          attendance: att._id,
          issuedAt: new Date(),
          issuedBy: req.user._id,
          status: 'Generated'
        });

        existingRegIdSet.add(regIdStr);
        existingStudentIdSet.add(studentIdStr);
        certificatesNewlyGenerated++;

        // Queue email only for newly generated certificates
        if (shouldSendEmail && studentDoc && studentDoc.email) {
          queueCertificateEmailAsync({
            student: studentDoc,
            event,
            certificate: newCert
          });
          emailsQueuedCount++;
        }
      } catch (err) {
        if (err.code === 11000) {
          // Concurrent duplicate caught safely
          certificatesAlreadyExisting++;
        } else {
          failedRecords.push({
            studentId: studentIdStr,
            registrationId: regIdStr,
            error: err.message
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk certificate generation completed. Newly generated: ${certificatesNewlyGenerated}, Existing/Skipped: ${certificatesAlreadyExisting}`,
      summary: {
        totalConfirmedRegistrations,
        totalVerifiedAttendees,
        certificatesNewlyGenerated,
        certificatesAlreadyExisting,
        emailsQueued: emailsQueuedCount,
        emailDeliveryRequested: shouldSendEmail,
        failedCount: failedRecords.length,
        failedRecords
      }
    });
  } catch (error) {
    console.error('[Certificate Controller Error - generateBulk]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process bulk certificate generation'
    });
  }
};

/**
 * Get Certificates Issued for an Event
 * GET /api/certificates/event/:eventId
 * Private (Admin only)
 */
const getEventCertificates = async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid event identifier format'
    });
  }

  try {
    const [certificates, totalAttendees] = await Promise.all([
      Certificate.find({ event: eventId })
        .populate('student', 'name email department year')
        .populate('issuedBy', 'name')
        .populate('releasedBy', 'name')
        .sort({ issuedAt: -1 }),
      Attendance.countDocuments({ event: eventId })
    ]);

    const generatedCount = certificates.filter((c) => c.status === 'Generated').length;
    const releasedCount = certificates.filter((c) => c.status === 'Released' || !c.status).length;
    const pendingCount = Math.max(0, totalAttendees - certificates.length);

    return res.status(200).json({
      success: true,
      count: certificates.length,
      stats: {
        totalAttendees,
        totalCertificates: certificates.length,
        generatedCount,
        releasedCount,
        pendingCount
      },
      certificates
    });
  } catch (error) {
    console.error('[Certificate Controller Error - getEventCertificates]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates for event'
    });
  }
};

/**
 * Release Certificates for an Event
 * POST /api/certificates/release
 * Private (Admin only)
 */
const releaseCertificates = async (req, res) => {
  const { eventId, certificateIds, sendEmail } = req.body;
  const shouldSendEmail = Boolean(sendEmail);

  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid event identifier is required'
    });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Build query for certificates belonging strictly to the selected event
    const query = { event: eventId };
    if (Array.isArray(certificateIds) && certificateIds.length > 0) {
      const validIds = certificateIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      query._id = { $in: validIds };
    }

    // Find candidate certificates populated with attendance and student
    const certificates = await Certificate.find(query)
      .populate('attendance')
      .populate('student');

    if (certificates.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No certificates found to release for this event',
        summary: {
          totalEligible: 0,
          newlyReleased: 0,
          alreadyReleased: 0,
          emailsQueued: 0
        }
      });
    }

    let newlyReleased = 0;
    let alreadyReleased = 0;
    let emailsQueued = 0;
    const now = new Date();

    for (const cert of certificates) {
      // Security check: Must have verified attendance belonging to this event
      if (!cert.attendance || cert.attendance.event.toString() !== eventId.toString()) {
        continue;
      }

      // Idempotency: skip if already released
      if (cert.status === 'Released') {
        alreadyReleased++;
        continue;
      }

      // Transition to Released
      cert.status = 'Released';
      cert.releasedAt = now;
      cert.releasedBy = req.user._id;
      await cert.save();
      newlyReleased++;

      // Optional email delivery upon release
      if (shouldSendEmail && cert.student && cert.student.email) {
        try {
          const pdfBuffer = await generateCertificatePdf({
            certificate: cert,
            student: cert.student,
            event
          });
          queueCertificateEmailAsync({
            student: cert.student,
            event,
            certificate: cert,
            pdfBuffer
          });
          emailsQueued++;
        } catch (emailErr) {
          console.error('[Certificate Release Email Error]:', emailErr.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Certificate release completed. Newly released: ${newlyReleased}, Already released: ${alreadyReleased}`,
      summary: {
        totalEligible: certificates.length,
        newlyReleased,
        alreadyReleased,
        emailsQueued
      }
    });
  } catch (error) {
    console.error('[Certificate Controller Error - releaseCertificates]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to release certificates'
    });
  }
};

/**
 * Get Authenticated Student's Certificates
 * GET /api/certificates/my-certificates
 * Private (Student only)
 */
const getMyCertificates = async (req, res) => {
  try {
    // Only return Released certificates (with backward compatibility for legacy certificates without status)
    const certificates = await Certificate.find({
      student: req.user._id,
      status: { $in: ['Released', null] }
    })
      .populate('event', 'title date startTime endTime venue category organizer')
      .sort({ issuedAt: -1 });

    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (error) {
    console.error('[Certificate Controller Error - getMyCertificates]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal certificates'
    });
  }
};

/**
 * Download Certificate as PDF
 * GET /api/certificates/:id/download
 * Private (Admin or Owning Student)
 */
const downloadCertificatePdf = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid certificate identifier format'
    });
  }

  try {
    const certificate = await Certificate.findById(id)
      .populate('student', 'name department year')
      .populate('event', 'title date venue organizer');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Authorization check: Admin or owning Student
    const isOwner = certificate.student && certificate.student._id.equals(req.user._id);
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to download this certificate'
      });
    }

    // Students cannot download unreleased certificates; Admins can preview any certificate
    if (!isAdmin && certificate.status === 'Generated') {
      return res.status(403).json({
        success: false,
        message: 'This certificate has been generated but not yet released by the event administrator'
      });
    }

    const pdfBuffer = await generateCertificatePdf({
      certificate,
      student: certificate.student,
      event: certificate.event
    });

    const safeFilename = `EventEase-Certificate-${certificate.certificateId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[Certificate Controller Error - downloadPdf]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate and stream certificate PDF'
    });
  }
};

/**
 * Public Certificate Verification
 * GET /api/certificates/verify/:certificateId
 * Public (No authentication required)
 */
const verifyCertificatePublic = async (req, res) => {
  const normalizedId = (req.params.certificateId || '').trim().toUpperCase();

  if (!normalizedId) {
    return res.status(400).json({
      success: false,
      valid: false,
      isReleased: false,
      message: 'Certificate ID is required'
    });
  }

  try {
    const certificate = await Certificate.findOne({ certificateId: normalizedId })
      .populate('student', 'name')
      .populate('event', 'title date venue organizer');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        valid: false,
        isReleased: false,
        message: 'Certificate not found or invalid certificate ID'
      });
    }

    // Resolve status: legacy certificates without a status field default to 'Released'
    const status = certificate.status || 'Released';
    const isReleased = status === 'Released';

    // Expose only non-sensitive verification data
    return res.status(200).json({
      success: true,
      valid: true,
      isReleased,
      status,
      certificateId: certificate.certificateId,
      studentName: certificate.student?.name || 'Verified Participant',
      eventTitle: certificate.event?.title || 'Campus Event',
      eventDate: certificate.event?.date || null,
      issuedAt: certificate.issuedAt,
      releasedAt: certificate.releasedAt || null,
      message: isReleased
        ? 'Certificate is officially verified and released'
        : 'Certificate has been generated but is pending official administrative release'
    });
  } catch (error) {
    console.error('[Certificate Controller Error - verifyPublic]:', error.message);
    return res.status(500).json({
      success: false,
      valid: false,
      isReleased: false,
      message: 'Failed to verify certificate'
    });
  }
};

module.exports = {
  generateIndividualCertificate,
  generateBulkCertificates,
  releaseCertificates,
  getEventCertificates,
  getMyCertificates,
  downloadCertificatePdf,
  verifyCertificatePublic
};

