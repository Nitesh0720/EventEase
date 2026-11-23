/**
 * Dedicated Temporary Test Helper for Module 7 QR Attendance Verification
 * File: backend/src/scripts/seedAttendanceTest.js
 *
 * Strictly for local development and testing.
 * Do not deploy to production or expose through an API endpoint.
 *
 * Usage:
 *   node src/scripts/seedAttendanceTest.js          # Create / reuse test event, student, registration & QR pass
 *   node src/scripts/seedAttendanceTest.js --cleanup # Remove all test data created by this helper
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment configuration from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const User = require('../models/User');
const { Event } = require('../models/Event');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');

const { generateRegistrationCode } = require('../utils/generateRegistrationCode');
const { generateQrToken } = require('../utils/qrToken');
const { generateQrBuffer, generateQrDataUrl } = require('../utils/generateQrCode');

// Test data constants
const TEST_EVENT_TITLE = 'EventEase Attendance Test';
const TEST_STUDENT_EMAIL = 'attendance.test.student@eventease.local';
const TEST_STUDENT_NAME = 'Attendance Test Student';
const TEST_STUDENT_PASSWORD = 'TestStudentPass123!';
const TEST_DEPARTMENT = 'Computer Science';
const TEST_YEAR = '3rd Year';

const QR_PNG_PATH = path.resolve(__dirname, 'attendance-test-qr.png');
const QR_HTML_PATH = path.resolve(__dirname, 'attendance-test-pass.html');

/**
 * Cleanup routine: removes only the test records and generated files
 */
const cleanupTestData = async () => {
  console.log('[Cleanup] Starting cleanup of Module 7 test data...');

  // 1. Find test event
  const testEvent = await Event.findOne({ title: TEST_EVENT_TITLE });
  const testStudent = await User.findOne({ email: TEST_STUDENT_EMAIL });

  let removedRegistrationsCount = 0;
  let removedAttendanceCount = 0;

  if (testEvent) {
    // Remove attendance records associated with this event
    const attendanceResult = await Attendance.deleteMany({ event: testEvent._id });
    removedAttendanceCount = attendanceResult.deletedCount || 0;

    // Remove registrations associated with this event
    const regResult = await Registration.deleteMany({ event: testEvent._id });
    removedRegistrationsCount = regResult.deletedCount || 0;

    // Remove event
    await Event.deleteOne({ _id: testEvent._id });
    console.log(`[Cleanup] Removed test event: "${TEST_EVENT_TITLE}" (${testEvent._id})`);
  } else {
    console.log('[Cleanup] No test event found to remove.');
  }

  // 2. Remove test student
  if (testStudent) {
    // Also remove any remaining registrations or attendance linked to this test student
    await Attendance.deleteMany({ student: testStudent._id });
    await Registration.deleteMany({ student: testStudent._id });
    await User.deleteOne({ _id: testStudent._id });
    console.log(`[Cleanup] Removed test student: "${TEST_STUDENT_EMAIL}" (${testStudent._id})`);
  } else {
    console.log('[Cleanup] No test student found to remove.');
  }

  // 3. Remove generated image and HTML files if they exist
  if (fs.existsSync(QR_PNG_PATH)) {
    fs.unlinkSync(QR_PNG_PATH);
    console.log(`[Cleanup] Deleted test QR image file: ${QR_PNG_PATH}`);
  }
  if (fs.existsSync(QR_HTML_PATH)) {
    fs.unlinkSync(QR_HTML_PATH);
    console.log(`[Cleanup] Deleted test HTML pass file: ${QR_HTML_PATH}`);
  }

  console.log(`[Cleanup] Completed. (Removed ${removedAttendanceCount} attendance records, ${removedRegistrationsCount} registrations)`);
};

/**
 * Main seed routine
 */
const seedAttendanceTest = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri === 'your_mongodb_connection_string') {
    console.error('Error: MONGODB_URI is not properly configured in backend/.env');
    process.exit(1);
  }

  const isCleanup = process.argv.includes('--cleanup');

  try {
    console.log('[Attendance Test Helper] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('[Attendance Test Helper] Connected to MongoDB.');

    if (isCleanup) {
      await cleanupTestData();
      await mongoose.disconnect();
      console.log('[Attendance Test Helper] Cleanup finished successfully.');
      process.exit(0);
    }

    // -------------------------------------------------------------
    // Step 1: Create or Reuse Dedicated Test Student Account
    // -------------------------------------------------------------
    let isStudentNewlyCreated = false;
    let testStudent = await User.findOne({ email: TEST_STUDENT_EMAIL });

    if (!testStudent) {
      testStudent = await User.create({
        name: TEST_STUDENT_NAME,
        email: TEST_STUDENT_EMAIL,
        password: TEST_STUDENT_PASSWORD,
        department: TEST_DEPARTMENT,
        year: TEST_YEAR,
        role: 'Student'
      });
      isStudentNewlyCreated = true;
      console.log(`[Attendance Test Helper] Created dedicated test student account: ${TEST_STUDENT_EMAIL}`);
    } else {
      console.log(`[Attendance Test Helper] Reusing existing test student account: ${TEST_STUDENT_EMAIL}`);
    }

    // -------------------------------------------------------------
    // Step 2: Create or Reuse Test Event with Active Attendance Window
    // -------------------------------------------------------------
    // Find an Admin user for the createdBy field
    let adminUser = await User.findOne({ role: 'Admin' });
    if (!adminUser) {
      adminUser = testStudent;
    }

    // Today's date with start time in the past and end time later today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(today);
    deadline.setHours(7, 30, 0, 0);

    let testEvent = await Event.findOne({ title: TEST_EVENT_TITLE });

    if (!testEvent) {
      testEvent = await Event.create({
        title: TEST_EVENT_TITLE,
        description: 'Dedicated test event for manual verification of Module 7 QR attendance scanning and check-in window validation.',
        category: 'Technical',
        date: today,
        startTime: '08:00 AM',
        endTime: '11:59 PM',
        venue: 'Campus Main Auditorium - QR Test Station',
        registrationDeadline: deadline,
        seatLimit: 50,
        registeredCount: 0,
        organizer: 'EventEase QA Team',
        status: 'Published',
        createdBy: adminUser._id
      });
      console.log(`[Attendance Test Helper] Created test event: "${TEST_EVENT_TITLE}" (ID: ${testEvent._id})`);
    } else {
      // Refresh event schedule so that the attendance window is currently active for today
      testEvent.date = today;
      testEvent.startTime = '08:00 AM';
      testEvent.endTime = '11:59 PM';
      testEvent.registrationDeadline = deadline;
      testEvent.status = 'Published';
      await testEvent.save();
      console.log(`[Attendance Test Helper] Reusing and refreshed test event schedule to today: "${TEST_EVENT_TITLE}" (ID: ${testEvent._id})`);
    }

    // -------------------------------------------------------------
    // Step 3: Create or Reuse Confirmed Registration
    // -------------------------------------------------------------
    let testRegistration = await Registration.findOne({
      student: testStudent._id,
      event: testEvent._id
    });

    if (!testRegistration) {
      testRegistration = await Registration.create({
        student: testStudent._id,
        event: testEvent._id,
        registrationCode: generateRegistrationCode(),
        status: 'Confirmed'
      });
      console.log(`[Attendance Test Helper] Created confirmed registration: ${testRegistration.registrationCode}`);
    } else {
      // Ensure registration is in Confirmed status
      if (testRegistration.status !== 'Confirmed') {
        testRegistration.status = 'Confirmed';
        testRegistration.cancelledAt = null;
        testRegistration.cancellationReason = '';
        await testRegistration.save();
      }
      console.log(`[Attendance Test Helper] Reusing confirmed registration: ${testRegistration.registrationCode}`);
    }

    // Update registeredCount on event to match confirmed registrations
    const confirmedCount = await Registration.countDocuments({
      event: testEvent._id,
      status: 'Confirmed'
    });
    testEvent.registeredCount = confirmedCount;
    await testEvent.save();

    // -------------------------------------------------------------
    // Step 4: Reset Any Existing Attendance for Clean Testing
    // -------------------------------------------------------------
    const existingAttendance = await Attendance.findOne({
      registration: testRegistration._id
    });

    if (existingAttendance) {
      await Attendance.deleteOne({ _id: existingAttendance._id });
      console.log('[Attendance Test Helper] Reset previous attendance record so the pass is immediately ready for check-in test.');
    }

    // -------------------------------------------------------------
    // Step 5: Generate Valid Signed Module 6 QR Token
    // -------------------------------------------------------------
    // Token is signed using the backend QR_SECRET and testEvent with final active date
    const qrToken = generateQrToken({
      registrationId: testRegistration._id.toString(),
      registrationCode: testRegistration.registrationCode,
      eventId: testEvent._id.toString(),
      event: testEvent
    });

    // -------------------------------------------------------------
    // Step 6: Generate PNG Image and HTML Pass for Browser Viewing
    // -------------------------------------------------------------
    const qrBuffer = await generateQrBuffer(qrToken);
    const qrDataUrl = await generateQrDataUrl(qrToken);

    fs.writeFileSync(QR_PNG_PATH, qrBuffer);
    console.log(`[Attendance Test Helper] Saved QR code PNG to: ${QR_PNG_PATH}`);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EventEase Attendance Test Pass</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
      padding: 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      background: #dcfce7;
      color: #15803d;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    h1 {
      font-size: 20px;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .subtitle {
      color: #64748b;
      font-size: 13px;
      margin: 0 0 20px;
    }
    .code-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 16px;
      font-weight: 700;
      color: #1e40af;
      letter-spacing: 1.5px;
      margin-bottom: 20px;
    }
    .qr-container {
      background: #ffffff;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 16px;
      display: inline-block;
      margin-bottom: 24px;
    }
    .qr-container img {
      width: 260px;
      height: 260px;
      display: block;
    }
    .info-table {
      width: 100%;
      text-align: left;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
    }
    .info-label {
      color: #64748b;
    }
    .info-value {
      color: #0f172a;
      font-weight: 600;
    }
    .token-details {
      margin-top: 20px;
      text-align: left;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      font-size: 11px;
      color: #64748b;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Active Check-In Pass</div>
    <h1>${testEvent.title}</h1>
    <p class="subtitle">Scan this QR code with the Admin Attendance Scanner or enter the registration code manually.</p>

    <div class="code-box">${testRegistration.registrationCode}</div>

    <div class="qr-container">
      <img src="${qrDataUrl}" alt="EventEase Attendance Test QR Code" />
    </div>

    <div class="info-table">
      <div class="info-row">
        <span class="info-label">Student:</span>
        <span class="info-value">${testStudent.name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${testStudent.email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Schedule:</span>
        <span class="info-value">Today, ${testEvent.startTime} - ${testEvent.endTime}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Venue:</span>
        <span class="info-value">${testEvent.venue}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Registration Status:</span>
        <span class="info-value" style="color: #16a34a;">${testRegistration.status}</span>
      </div>
    </div>

    <div class="token-details">
      <strong>Raw Signed Token (v1):</strong><br>
      ${qrToken}
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(QR_HTML_PATH, htmlContent, 'utf-8');
    console.log(`[Attendance Test Helper] Saved browser-viewable pass HTML to: ${QR_HTML_PATH}`);

    // -------------------------------------------------------------
    // Step 7: Print Summary Report (No Secrets Exposed)
    // -------------------------------------------------------------
    console.log('\n======================================================');
    console.log('EVENT EASE MODULE 7 TEST DATA PROVISIONED SUCCESSFULLY');
    console.log('======================================================');
    console.log(`Test Event ID:          ${testEvent._id}`);
    console.log(`Test Event Title:       ${testEvent.title}`);
    console.log(`Event Status:           ${testEvent.status}`);
    console.log(`Event Active Window:    Today (${testEvent.startTime} to ${testEvent.endTime})`);
    console.log('------------------------------------------------------');
    console.log(`Student ID:             ${testStudent._id}`);
    console.log(`Student Name:           ${testStudent.name}`);
    console.log(`Student Email:          ${testStudent.email}`);
    if (isStudentNewlyCreated) {
      console.log(`Student Temp Password:  ${TEST_STUDENT_PASSWORD}`);
    } else {
      console.log('Student Password:       [Existing account preserved]');
    }
    console.log('------------------------------------------------------');
    console.log(`Registration ID:        ${testRegistration._id}`);
    console.log(`Registration Code:      ${testRegistration.registrationCode}`);
    console.log(`Registration Status:    ${testRegistration.status}`);
    console.log('------------------------------------------------------');
    console.log('QR PASS ARTIFACTS:');
    console.log(`PNG Image File:         ${QR_PNG_PATH}`);
    console.log(`Browser Pass (HTML):    ${QR_HTML_PATH}`);
    console.log('------------------------------------------------------');
    console.log('HOW TO TEST IN EVENT EASE ADMIN UI:');
    console.log('1. Log into EventEase as an Administrator.');
    console.log('2. Navigate to Admin Dashboard -> Attendance Management.');
    console.log(`3. Select event: "${testEvent.title}".`);
    console.log('4. Option A (Camera Scanner): Open the HTML file in any browser');
    console.log('   or phone and point your camera / webcam at the QR code.');
    console.log(`5. Option B (Manual Code): Enter registration code "${testRegistration.registrationCode}"`);
    console.log('   into the Manual Check-In input and click "Check In".');
    console.log('------------------------------------------------------');
    console.log('CLEANUP INSTRUCTIONS:');
    console.log('To remove all test data and generated QR pass files, run:');
    console.log('  node src/scripts/seedAttendanceTest.js --cleanup');
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Attendance Test Helper] Failed with error:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Execute script
seedAttendanceTest();
