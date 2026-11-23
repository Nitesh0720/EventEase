const mongoose = require('mongoose');

const eventCategories = [
  'Technical',
  'Cultural',
  'Workshop',
  'Competition',
  'Seminar',
  'Sports',
  'Other'
];

const eventStatuses = ['Draft', 'Published', 'Cancelled'];

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
      minlength: [3, 'Event title must be at least 3 characters'],
      maxlength: [120, 'Event title cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide an event description'],
      trim: true,
      minlength: [10, 'Event description must be at least 10 characters']
    },
    category: {
      type: String,
      required: [true, 'Please select an event category'],
      enum: {
        values: eventCategories,
        message: 'Invalid event category'
      }
    },
    date: {
      type: Date,
      required: [true, 'Please provide the event date']
    },
    startTime: {
      type: String,
      required: [true, 'Please provide the start time (e.g. 09:30 AM or 10:00)']
    },
    endTime: {
      type: String,
      required: [true, 'Please provide the end time (e.g. 04:30 PM or 17:00)']
    },
    venue: {
      type: String,
      required: [true, 'Please provide the event venue / room'],
      trim: true
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Please provide the registration deadline']
    },
    seatLimit: {
      type: Number,
      required: [true, 'Please specify the maximum seat limit'],
      min: [1, 'Seat limit must be at least 1']
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'Registered count cannot be negative']
    },
    organizer: {
      type: String,
      required: [true, 'Please specify the organizing department or club'],
      trim: true
    },
    poster: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: eventStatuses,
        message: 'Status must be Draft, Published, or Cancelled'
      },
      default: 'Draft'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high performance querying
eventSchema.index({ status: 1, date: 1 });
eventSchema.index({ category: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = {
  Event,
  eventCategories,
  eventStatuses
};
