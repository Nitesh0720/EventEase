const mongoose = require('mongoose');
const { Event, eventCategories, eventStatuses } = require('../models/Event');

/**
 * Combines a Date object or ISO date string with a time string (e.g. "09:30 AM" or "14:00")
 * @param {Date|string} dateInput - The base date
 * @param {string} timeStr - The time of day
 * @returns {Date|null} Combined Date object with exact hours and minutes
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
 * Get events catalog.
 * Public/Students: only Published events.
 * Admins: all events (Draft, Published, Cancelled) with optional status filter.
 * GET /api/events
 */
const getEvents = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'Admin';
    const query = {};

    if (isAdmin) {
      // If admin requested a specific status via query parameter, filter by it
      if (req.query.status && eventStatuses.includes(req.query.status)) {
        query.status = req.query.status;
      }
    } else {
      // Public visitors and Students can only view Published events
      query.status = 'Published';
    }

    // Optional category filter
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }

    // Optional search query
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { organizer: searchRegex },
        { venue: searchRegex }
      ];
    }

    const events = await Event.find(query)
      .sort({ date: 1, startTime: 1 })
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('[Get Events Error]', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve events'
    });
  }
};

/**
 * Get single event by ID.
 * Public/Students can only view if Published.
 * Admins can view any event.
 * GET /api/events/:id
 */
const getEventById = async (req, res) => {
  try {
    // Validate MongoDB ObjectId to prevent CastError
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = await Event.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const isAdmin = req.user && req.user.role === 'Admin';
    if (!isAdmin && event.status !== 'Published') {
      return res.status(404).json({
        success: false,
        message: 'Event is not publicly accessible'
      });
    }

    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('[Get Event By ID Error]', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve event details'
    });
  }
};

/**
 * Create a new event
 * POST /api/events
 * Admin only
 */
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      date,
      startTime,
      endTime,
      venue,
      registrationDeadline,
      seatLimit,
      organizer,
      poster,
      status
    } = req.body;

    // Validate required fields presence
    if (
      !title ||
      !description ||
      !category ||
      !date ||
      !startTime ||
      !endTime ||
      !venue ||
      !registrationDeadline ||
      seatLimit === undefined ||
      seatLimit === null ||
      seatLimit === '' ||
      !organizer
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required event fields'
      });
    }

    // Validate category
    if (!eventCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${eventCategories.join(', ')}`
      });
    }

    // Validate seat limit
    const parsedSeatLimit = Number(seatLimit);
    if (!Number.isInteger(parsedSeatLimit) || parsedSeatLimit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Seat limit must be a positive whole number greater than 0'
      });
    }

    // Date validations
    const now = new Date();
    const eventStart = parseDateTime(date, startTime);
    const regDeadline = new Date(registrationDeadline);

    if (!eventStart || isNaN(eventStart.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event date or start time format'
      });
    }

    if (!regDeadline || isNaN(regDeadline.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration deadline date format'
      });
    }

    // Rule 1: Event date & start time must be in the future
    if (eventStart <= now) {
      return res.status(400).json({
        success: false,
        message: 'Event date and start time must be in the future'
      });
    }

    // Rule 2: Registration deadline must be in the future
    if (regDeadline <= now) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline must be in the future'
      });
    }

    // Rule 3: Registration deadline must be before the event's actual start time
    if (regDeadline >= eventStart) {
      return res.status(400).json({
        success: false,
        message:
          'Registration deadline must be scheduled before the event actual start time'
      });
    }

    // Status validation
    const eventStatus = status || 'Draft';
    if (!eventStatuses.includes(eventStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Draft, Published, or Cancelled'
      });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      category,
      date: new Date(date),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      venue: venue.trim(),
      registrationDeadline: regDeadline,
      seatLimit: parsedSeatLimit,
      organizer: organizer.trim(),
      poster: poster ? poster.trim() : '',
      status: eventStatus,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('[Create Event Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating event'
    });
  }
};

/**
 * Update an existing event
 * PUT /api/events/:id
 * Admin only
 */
const updateEvent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Prevent modifying a cancelled event
    if (event.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a cancelled event. Please create a new event'
      });
    }

    const {
      title,
      description,
      category,
      date,
      startTime,
      endTime,
      venue,
      registrationDeadline,
      seatLimit,
      organizer,
      poster,
      status
    } = req.body;

    // Validate category if provided
    if (category && !eventCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${eventCategories.join(', ')}`
      });
    }

    // Validate seat limit if provided
    let parsedSeatLimit = event.seatLimit;
    if (seatLimit !== undefined) {
      parsedSeatLimit = Number(seatLimit);
      if (!Number.isInteger(parsedSeatLimit) || parsedSeatLimit < 1) {
        return res.status(400).json({
          success: false,
          message: 'Seat limit must be a positive whole number greater than 0'
        });
      }
    }

    // Date validations
    const targetDate = date ? new Date(date) : event.date;
    const targetStartTime = startTime ? startTime.trim() : event.startTime;
    const targetRegDeadline = registrationDeadline
      ? new Date(registrationDeadline)
      : event.registrationDeadline;

    const now = new Date();
    const eventStart = parseDateTime(targetDate, targetStartTime);

    // If dates are being changed, enforce future checks
    if (date || startTime) {
      if (eventStart <= now) {
        return res.status(400).json({
          success: false,
          message: 'Event date and start time must be in the future'
        });
      }
    }

    if (registrationDeadline) {
      if (targetRegDeadline <= now) {
        return res.status(400).json({
          success: false,
          message: 'Registration deadline must be in the future'
        });
      }
    }

    if (targetRegDeadline >= eventStart) {
      return res.status(400).json({
        success: false,
        message:
          'Registration deadline must be scheduled before the event actual start time'
      });
    }

    // Status transition validation
    if (status) {
      if (!eventStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be Draft, Published, or Cancelled'
        });
      }
      event.status = status;
    }

    if (title) event.title = title.trim();
    if (description) event.description = description.trim();
    if (category) event.category = category;
    if (date) event.date = targetDate;
    if (startTime) event.startTime = targetStartTime;
    if (endTime) event.endTime = endTime.trim();
    if (venue) event.venue = venue.trim();
    if (registrationDeadline) event.registrationDeadline = targetRegDeadline;
    event.seatLimit = parsedSeatLimit;
    if (organizer) event.organizer = organizer.trim();
    if (poster !== undefined) event.poster = poster.trim();

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('[Update Event Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating event'
    });
  }
};

/**
 * Update event status (Draft <-> Published <-> Cancelled)
 * PATCH /api/events/:id/status
 * Admin only
 */
const updateEventStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const { status } = req.body;

    if (!status || !eventStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Draft, Published, or Cancelled'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Disallow transitions from Cancelled
    if (event.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change the status of an event that has already been cancelled'
      });
    }

    // If publishing, ensure event date and registration deadline are still in the future
    if (status === 'Published') {
      const now = new Date();
      const eventStart = parseDateTime(event.date, event.startTime);
      if (eventStart <= now) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish an event with a date/time in the past'
        });
      }
    }

    event.status = status;
    await event.save();

    res.status(200).json({
      success: true,
      message: `Event status updated to ${status}`,
      event
    });
  } catch (error) {
    console.error('[Update Event Status Error]', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update event status'
    });
  }
};

/**
 * Soft delete an event by changing its status to Cancelled
 * DELETE /api/events/:id
 * Admin only
 */
const deleteEvent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Event is already cancelled'
      });
    }

    // Soft deletion: change status to Cancelled
    event.status = 'Cancelled';
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event has been cancelled successfully',
      event
    });
  } catch (error) {
    console.error('[Delete Event Error]', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel event'
    });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent
};
