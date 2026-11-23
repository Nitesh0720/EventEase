const mongoose = require('mongoose');
const { Event } = require('../models/Event');
const Registration = require('../models/Registration');
const { generateRegistrationCode } = require('../utils/generateRegistrationCode');
const { generateQrToken } = require('../utils/qrToken');
const { generateQrDataUrl, generateQrBuffer } = require('../utils/generateQrCode');
const { queueRegistrationEmailAsync, maskEmail } = require('../utils/sendEmail');

/**
 * Register student for an event using a native MongoDB transaction
 * POST /api/registrations/:eventId
 * Private (Student only)
 */
const registerForEvent = async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const event = await Event.findById(eventId).session(session);

    if (!event) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.status !== 'Published') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot register for an event with status '${event.status}'`
      });
    }

    // Validate registration deadline
    const now = new Date();
    const deadline = new Date(event.registrationDeadline);
    if (deadline <= now) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed for this event'
      });
    }

    // Validate event start time
    const [startHour, startMin] = (event.startTime || '00:00').split(':').map(Number);
    const eventStartDateTime = new Date(event.date);
    eventStartDateTime.setHours(startHour, startMin, 0, 0);

    if (eventStartDateTime <= now) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot register for an event that has already started or concluded'
      });
    }

    // Check existing registration
    const existingRegistration = await Registration.findOne({
      student: req.user._id,
      event: eventId
    }).session(session);

    if (existingRegistration && existingRegistration.status === 'Confirmed') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    // Atomically check capacity and increment registeredCount
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $expr: { $lt: ['$registeredCount', '$seatLimit'] }
      },
      {
        $inc: { registeredCount: 1 }
      },
      {
        session,
        new: true
      }
    );

    if (!updatedEvent) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Event is fully booked. No remaining seats available'
      });
    }

    let registration;

    if (existingRegistration && existingRegistration.status === 'Cancelled') {
      // Reactivate cancelled registration
      existingRegistration.status = 'Confirmed';
      existingRegistration.registrationCode = generateRegistrationCode();
      existingRegistration.registeredAt = new Date();
      existingRegistration.cancelledAt = null;
      existingRegistration.cancellationReason = '';
      registration = await existingRegistration.save({ session });
    } else {
      // Create new registration
      const code = generateRegistrationCode();
      const created = await Registration.create(
        [
          {
            student: req.user._id,
            event: eventId,
            registrationCode: code,
            status: 'Confirmed',
            registeredAt: new Date()
          }
        ],
        { session }
      );
      registration = created[0];
    }

    await session.commitTransaction();

    // Generate signed QR token and trigger non-blocking email delivery after commit
    try {
      const qrToken = generateQrToken({
        registrationId: registration._id,
        registrationCode: registration.registrationCode,
        eventId: event._id,
        event
      });

      // Generate binary QR buffer asynchronously for email attachment
      generateQrBuffer(qrToken)
        .then((qrBuffer) => {
          queueRegistrationEmailAsync({
            student: req.user,
            event,
            registration,
            qrBuffer
          });
        })
        .catch((qrErr) => {
          console.error('[Registration] QR buffer generation error for email:', qrErr.message);
        });
    } catch (qrGenErr) {
      console.error('[Registration] QR token generation error for email:', qrGenErr.message);
    }

    // Populate event details for the response
    const populated = await Registration.findById(registration._id).populate({
      path: 'event',
      select: 'title category date startTime endTime venue seatLimit registeredCount'
    });

    console.log(
      `[Registration Success] Student ${req.user.name} (${maskEmail(req.user.email)}) registered for "${event.title}" - Code: ${registration.registrationCode}`
    );

    return res.status(201).json({
      success: true,
      message: 'Registration confirmed successfully',
      data: {
        registration: populated,
        remainingSeats: updatedEvent.seatLimit - updatedEvent.registeredCount
      }
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error during event registration:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while processing registration'
    });
  } finally {
    session.endSession();
  }
};

/**
 * Cancel student's registration using a native MongoDB transaction
 * DELETE /api/registrations/:registrationId
 * Private (Student only)
 */
const cancelRegistration = async (req, res) => {
  const { registrationId } = req.params;
  const { reason } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(registrationId)) {
    return res.status(400).json({ success: false, message: 'Invalid registration identifier' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const registration = await Registration.findById(registrationId).session(session);

    if (!registration) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Registration record not found' });
    }

    if (registration.student.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this registration'
      });
    }

    if (registration.status === 'Cancelled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This registration has already been cancelled'
      });
    }

    const event = await Event.findById(registration.event).session(session);

    if (!event) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Associated event not found' });
    }

    // Prevent cancellation if event has already started
    const now = new Date();
    const [startHour, startMin] = (event.startTime || '00:00').split(':').map(Number);
    const eventStartDateTime = new Date(event.date);
    eventStartDateTime.setHours(startHour, startMin, 0, 0);

    if (eventStartDateTime <= now) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel registration for an event that has already started or ended'
      });
    }

    // Atomically release one seat, guaranteeing registeredCount never drops below 0
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: registration.event,
        registeredCount: { $gt: 0 }
      },
      {
        $inc: { registeredCount: -1 }
      },
      {
        session,
        new: true
      }
    );

    if (!updatedEvent) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: 'Seat count inconsistency detected. Cancellation aborted'
      });
    }

    registration.status = 'Cancelled';
    registration.cancelledAt = new Date();
    registration.cancellationReason = (reason && typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Cancelled by student';
    await registration.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully. Seat released',
      data: {
        registration,
        remainingSeats: updatedEvent.seatLimit - updatedEvent.registeredCount
      }
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error during registration cancellation:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while cancelling registration'
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get current student's registered events
 * GET /api/registrations/my
 * Private (Student only)
 */
const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ student: req.user._id })
      .populate({
        path: 'event',
        select: 'title description category date startTime endTime venue poster status registrationDeadline seatLimit registeredCount'
      })
      .sort({ registeredAt: -1 });

    return res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching student registrations:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve registrations'
    });
  }
};

/**
 * Check if the student is registered for a specific event
 * GET /api/registrations/check/:eventId
 * Private (Student only)
 */
const checkEventRegistration = async (req, res) => {
  const { eventId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ success: false, message: 'Invalid event identifier' });
  }

  try {
    const registration = await Registration.findOne({
      student: req.user._id,
      event: eventId
    });

    const isRegistered = Boolean(registration && registration.status === 'Confirmed');

    return res.status(200).json({
      success: true,
      data: {
        isRegistered,
        registration: registration || null
      }
    });
  } catch (error) {
    console.error('Error checking registration status:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify registration status'
    });
  }
};

/**
 * Retrieve verified QR Digital Pass for confirmed event registration
 * GET /api/registrations/:registrationId/pass
 * Private (Student only)
 */
const getDigitalPass = async (req, res) => {
  const { registrationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(registrationId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid registration identifier'
    });
  }

  try {
    const registration = await Registration.findById(registrationId)
      .populate({
        path: 'event',
        select: 'title category date startTime endTime venue organizer status seatLimit registeredCount'
      })
      .populate({
        path: 'student',
        select: 'name email department year'
      });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found'
      });
    }

    // Ownership check: only the student who registered can view their pass
    if (registration.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this digital pass'
      });
    }

    // Status check: cancelled registrations cannot access or generate passes
    if (registration.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Digital pass is unavailable for cancelled registrations'
      });
    }

    // Event check: cancelled events cannot produce active passes
    if (!registration.event || registration.event.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Digital pass is unavailable for cancelled events'
      });
    }

    // Generate signed, tamper-resistant QR token
    const qrToken = generateQrToken({
      registrationId: registration._id,
      registrationCode: registration.registrationCode,
      eventId: registration.event._id,
      event: registration.event
    });

    // Generate base64 Data URL for immediate rendering on frontend
    const qrCodeDataUrl = await generateQrDataUrl(qrToken);

    return res.status(200).json({
      success: true,
      data: {
        registrationId: registration._id,
        registrationCode: registration.registrationCode,
        status: registration.status,
        registeredAt: registration.registeredAt,
        student: {
          id: registration.student._id,
          name: registration.student.name,
          email: registration.student.email,
          department: registration.student.department,
          year: registration.student.year
        },
        event: {
          id: registration.event._id,
          title: registration.event.title,
          category: registration.event.category,
          date: registration.event.date,
          startTime: registration.event.startTime,
          endTime: registration.event.endTime,
          venue: registration.event.venue,
          organizer: registration.event.organizer
        },
        qrToken,
        qrCodeDataUrl
      }
    });
  } catch (error) {
    console.error('Error retrieving digital pass:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate digital pass'
    });
  }
};

module.exports = {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  checkEventRegistration,
  getDigitalPass
};
