/**
 * Standalone Local Test-Data Helper for Certificate Generation (Module 8)
 * File: backend/src/scripts/seedCertificateTest.js
 *
 * Provisions a dedicated, concluded test event, confirmed registration,
 * and verified attendance record ready for manual certificate testing.
 *
 * Usage:
 *   node src/scripts/seedCertificateTest.js          # Create or reuse test fixtures
 *   node src/scripts/seedCertificateTest.js --cleanup # Remove only records belonging to this fixture
 */

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
const Certificate = require('../models/Certificate');
const { generateRegistrationCode } = require('../utils/generateRegistrationCode');

// Test fixture constants
const TEST_EVENT_TITLE = 'EventEase Certificate Test Event';
const TEST_STUDENT_EMAIL = 'certificate.test.student@eventease.local';
const TEST_STUDENT_NAME = 'Certificate Test Student';
const TEST_STUDENT_PASSWORD = 'CertTestPass2026!';
const TEST_DEPARTMENT = 'Computer Science & Engineering';
const TEST_YEAR = '4th Year';

/**
 * Cleanup routine: deletes only records belonging to this test fixture in dependency order
 */
const cleanupTestData = async () => {
  console.log('[Cleanup] Starting cleanup of Module 8 certificate test fixtures...');

  const testEvent = await Event.findOne({ title: TEST_EVENT_TITLE });
  const testStudent = await User.findOne({ email: TEST_STUDENT_EMAIL });

  let certificatesDeleted = 0;
  let attendanceDeleted = 0;
  let registrationsDeleted = 0;
  let eventsDeleted = 0;
  let usersDeleted = 0;

  // 1. Delete certificates created during manual testing for this event or student
  const certQuery = {
    $or: []
  };
  if (testEvent) certQuery.$or.push({ event: testEvent._id });
  if (testStudent) certQuery.$or.push({ student: testStudent._id });

  if (certQuery.$or.length > 0) {
    const certResult = await Certificate.deleteMany(certQuery);
    certificatesDeleted = certResult.deletedCount || 0;
  }

  // 2. Delete attendance records for this fixture
  const attQuery = {
    $or: []
  };
  if (testEvent) attQuery.$or.push({ event: testEvent._id });
  if (testStudent) attQuery.$or.push({ student: testStudent._id });

  if (attQuery.$or.length > 0) {
    const attResult = await Attendance.deleteMany(attQuery);
    attendanceDeleted = attResult.deletedCount || 0;
  }

  // 3. Delete registration records for this fixture
  const regQuery = {
    $or: []
  };
  if (testEvent) regQuery.$or.push({ event: testEvent._id });
  if (testStudent) regQuery.$or.push({ student: testStudent._id });

  if (regQuery.$or.length > 0) {
    const regResult = await Registration.deleteMany(regQuery);
    registrationsDeleted = regResult.deletedCount || 0;
  }

  // 4. Delete test event
  if (testEvent) {
    await Event.deleteOne({ _id: testEvent._id });
    eventsDeleted = 1;
    console.log(`[Cleanup] Deleted test event: "${TEST_EVENT_TITLE}" (${testEvent._id})`);
  }

  // 5. Delete test student
  if (testStudent) {
    await User.deleteOne({ _id: testStudent._id });
    usersDeleted = 1;
    console.log(`[Cleanup] Deleted test student: "${TEST_STUDENT_EMAIL}" (${testStudent._id})`);
  }

  console.log('[Cleanup] Summary of deleted records:');
  console.log(`  - Certificates:  ${certificatesDeleted}`);
  console.log(`  - Attendance:    ${attendanceDeleted}`);
  console.log(`  - Registrations: ${registrationsDeleted}`);
  console.log(`  - Events:        ${eventsDeleted}`);
  console.log(`  - Users:         ${usersDeleted}`);
  console.log('[Cleanup] Completed cleanly. No production or unrelated data was affected.');
};

/**
 * Main seeding routine
 */
const seedCertificateTest = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri === 'your_mongodb_connection_string') {
    console.error('Error: MONGODB_URI is not properly configured in backend/.env');
    process.exit(1);
  }

  const isCleanup = process.argv.includes('--cleanup');

  try {
    console.log('[Certificate Test Fixture] Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('[Certificate Test Fixture] Connected to MongoDB Atlas.');

    if (isCleanup) {
      await cleanupTestData();
      await mongoose.disconnect();
      console.log('[Certificate Test Fixture] Cleanup completed successfully.');
      process.exit(0);
    }

    // -------------------------------------------------------------
    // Step 1: Find an Admin account for createdBy & markedBy references
    // -------------------------------------------------------------
    let adminUser = await User.findOne({ role: 'Admin' });
    if (!adminUser) {
      console.error('Error: No Administrator account exists in database. Run npm run seed:admin first.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Step 2: Create or Reuse Dedicated Test Student
    // -------------------------------------------------------------
    let isStudentNew = false;
    let testStudent = await User.findOne({ email: TEST_STUDENT_EMAIL });

    if (!testStudent) {
      testStudent = await User.create({
        name: TEST_STUDENT_NAME,
        email: TEST_STUDENT_EMAIL,
        password: TEST_STUDENT_PASSWORD, // Hashed via User pre-save hook
        department: TEST_DEPARTMENT,
        year: TEST_YEAR,
        role: 'Student'
      });
      isStudentNew = true;
      console.log(`[Certificate Test Fixture] Created dedicated test student: ${TEST_STUDENT_EMAIL}`);
    } else {
      console.log(`[Certificate Test Fixture] Reusing existing test student: ${TEST_STUDENT_EMAIL}`);
    }

    // -------------------------------------------------------------
    // Step 3: Create or Reuse Concluded Published Test Event
    // -------------------------------------------------------------
    // Scheduled safely in the past so the event is concluded and eligible for certificate issuance
    const pastDate = new Date(Date.now() - 48 * 3600 * 1000);
    pastDate.setHours(0, 0, 0, 0);

    const deadline = new Date(pastDate);
    deadline.setHours(8, 0, 0, 0);

    let testEvent = await Event.findOne({ title: TEST_EVENT_TITLE });

    if (!testEvent) {
      testEvent = await Event.create({
        title: TEST_EVENT_TITLE,
        description: 'Dedicated concluded campus event fixture for manual testing of Module 8 certificate issuance and download.',
        category: 'Technical',
        date: pastDate,
        startTime: '09:00 AM',
        endTime: '05:00 PM',
        venue: 'Campus Main Conference Hall',
        registrationDeadline: deadline,
        seatLimit: 100,
        registeredCount: 1,
        organizer: 'EventEase Certification QA Team',
        status: 'Published',
        createdBy: adminUser._id
      });
      console.log(`[Certificate Test Fixture] Created test event: "${TEST_EVENT_TITLE}" (ID: ${testEvent._id})`);
    } else {
      // Ensure existing event retains concluded past date and Published status
      testEvent.date = pastDate;
      testEvent.startTime = '09:00 AM';
      testEvent.endTime = '05:00 PM';
      testEvent.status = 'Published';
      await testEvent.save();
      console.log(`[Certificate Test Fixture] Reused and verified concluded test event: "${TEST_EVENT_TITLE}" (ID: ${testEvent._id})`);
    }

    // -------------------------------------------------------------
    // Step 4: Create or Reuse Confirmed Registration
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
      console.log(`[Certificate Test Fixture] Created confirmed registration: ${testRegistration.registrationCode}`);
    } else {
      if (testRegistration.status !== 'Confirmed') {
        testRegistration.status = 'Confirmed';
        testRegistration.cancelledAt = null;
        testRegistration.cancellationReason = '';
        await testRegistration.save();
      }
      console.log(`[Certificate Test Fixture] Reusing confirmed registration: ${testRegistration.registrationCode}`);
    }

    // Sync event registeredCount
    const confirmedCount = await Registration.countDocuments({
      event: testEvent._id,
      status: 'Confirmed'
    });
    testEvent.registeredCount = confirmedCount;
    await testEvent.save();

    // -------------------------------------------------------------
    // Step 5: Create or Reuse Matching Attendance Record
    // -------------------------------------------------------------
    let testAttendance = await Attendance.findOne({
      registration: testRegistration._id
    });

    const checkInTimestamp = new Date(pastDate);
    checkInTimestamp.setHours(9, 15, 0, 0);

    if (!testAttendance) {
      testAttendance = await Attendance.create({
        registration: testRegistration._id,
        student: testStudent._id,
        event: testEvent._id,
        checkInTime: checkInTimestamp,
        markedBy: adminUser._id,
        method: 'QR_SCAN'
      });
      console.log(`[Certificate Test Fixture] Created verified attendance record (ID: ${testAttendance._id})`);
    } else {
      // Ensure references match exactly
      testAttendance.student = testStudent._id;
      testAttendance.event = testEvent._id;
      await testAttendance.save();
      console.log(`[Certificate Test Fixture] Reusing verified attendance record (ID: ${testAttendance._id})`);
    }

    // -------------------------------------------------------------
    // Step 6: Certificate Status Inspection (Do NOT create certificate)
    // -------------------------------------------------------------
    const existingCertificate = await Certificate.findOne({
      event: testEvent._id,
      student: testStudent._id
    });

    // -------------------------------------------------------------
    // Step 7: Output Report for Manual Testing
    // -------------------------------------------------------------
    console.log('\n======================================================');
    console.log('EVENT EASE MODULE 8 CERTIFICATE TEST FIXTURE READY');
    console.log('======================================================');
    console.log(`Test Event ID:          ${testEvent._id}`);
    console.log(`Test Event Title:       ${testEvent.title}`);
    console.log(`Event Status:           ${testEvent.status}`);
    console.log(`Event Scheduled Date:   ${testEvent.date.toDateString()} (${testEvent.startTime} to ${testEvent.endTime})`);
    console.log(`Event Concluded:        YES (End time is in the past)`);
    console.log('------------------------------------------------------');
    console.log(`Student ID:             ${testStudent._id}`);
    console.log(`Student Name:           ${testStudent.name}`);
    console.log(`Student Email:          ${testStudent.email}`);
    console.log(`Student Role:           ${testStudent.role}`);
    console.log(`Student Department:     ${testStudent.department}`);
    console.log(`Student Year:           ${testStudent.year}`);
    console.log(`Student Password:       [SECURELY HASHED IN DATABASE - NOT LOGGED]`);
    console.log('------------------------------------------------------');
    console.log(`Registration ID:        ${testRegistration._id}`);
    console.log(`Registration Code:      ${testRegistration.registrationCode}`);
    console.log(`Registration Status:    ${testRegistration.status}`);
    console.log('------------------------------------------------------');
    console.log(`Attendance ID:          ${testAttendance._id}`);
    console.log(`Attendance Method:      ${testAttendance.method}`);
    console.log(`Attendance Verified:    YES`);
    console.log('------------------------------------------------------');
    if (existingCertificate) {
      console.log(`Certificate Status:     ALREADY ISSUED (ID: ${existingCertificate.certificateId})`);
      console.log(`Issued At:              ${existingCertificate.issuedAt}`);
    } else {
      console.log(`Certificate Status:     NOT YET ISSUED (Eligible for Manual Generation)`);
    }
    console.log('------------------------------------------------------');
    console.log('HOW TO MANUALLY TEST CERTIFICATE GENERATION:');
    console.log('1. Log into EventEase as an Administrator.');
    console.log('2. Navigate to Admin -> Certificates (http://localhost:3000/admin/certificates).');
    console.log(`3. Select event: "${testEvent.title}".`);
    console.log('4. Verify that "Verified Attendees" displays 1 and "Pending Issuance" displays 1.');
    console.log('5. Switch to the "Pending Attendees" tab and click "Issue Certificate"');
    console.log('   or click the "Generate All (1)" bulk button.');
    console.log('6. Once issued, click "Download PDF" to test PDF download.');
    console.log('7. Open http://localhost:3000/verify-certificate/<CERT_ID> to test public verification.');
    console.log('------------------------------------------------------');
    console.log('CLEANUP COMMAND:');
    console.log('To remove only these test records, run:');
    console.log('  node src/scripts/seedCertificateTest.js --cleanup');
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Certificate Test Fixture Error]:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

seedCertificateTest();

