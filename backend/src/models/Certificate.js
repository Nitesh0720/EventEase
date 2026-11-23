const mongoose = require('mongoose');

/**
 * Certificate Schema
 * Module 8: Certificate Generation and Download
 *
 * Represents an official certificate of participation or completion
 * awarded exclusively to students with verified attendance at an event.
 */
const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: [true, 'Certificate ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required']
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: [true, 'Registration reference is required'],
      unique: true
    },
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: [true, 'Attendance reference is required'],
      unique: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin identifier is required']
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index guaranteeing exactly one certificate per student per event
certificateSchema.index({ event: 1, student: 1 }, { unique: true });

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;

