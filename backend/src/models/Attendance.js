const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: [true, 'Registration reference is required'],
      unique: true // Guarantees exactly one attendance record per registration
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required']
    },
    checkInTime: {
      type: Date,
      default: Date.now,
      required: true
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin identifier is required']
    },
    method: {
      type: String,
      enum: {
        values: ['QR_SCAN', 'MANUAL'],
        message: 'Method must be either QR_SCAN or MANUAL'
      },
      default: 'QR_SCAN',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
attendanceSchema.index({ event: 1, checkInTime: -1 });
attendanceSchema.index({ event: 1, student: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
