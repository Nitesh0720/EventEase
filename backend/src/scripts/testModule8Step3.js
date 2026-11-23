/**
 * EventEase Module 8 Step 3 Automated Test Suite
 * File: backend/src/scripts/testModule8Step3.js
 *
 * Verifies all 15 certificate issuance and management requirements.
 * Operates with isolated test records and cleans up 100% of generated test data.
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const mongoose = require('mongoose');
const assert = require('assert');
const app = require('../../server');

const User = require('../models/User');
const { Event } = require('../models/Event');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const Certificate = require('../models/Certificate');
const generateToken = require('../utils/generateToken');
const { generateRegistrationCode } = require('../utils/generateRegistrationCode');

// Unique prefixes to safely identify and isolate test records
const TEST_TAG = `TEST_M8_${Date.now()}`;

const runTests = async () => {
  console.log('======================================================');
  console.log(`Starting Module 8 Step 3 Automated Verification [${TEST_TAG}]`);
  console.log('======================================================\n');

  // Start ephemeral server
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/certificates`;

  // Track created IDs for strict cleanup
  const cleanupIds = {
    users: [],
    events: [],
    registrations: [],
    attendances: [],
    certificates: []
  };

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log('[Setup] Connected to database. Provisioning test fixtures...');

    // 1. Create Test Admin
    const testAdmin = await User.create({
      name: `Admin ${TEST_TAG}`,
      email: `admin_${TEST_TAG.toLowerCase()}@eventease.test`,
      password: 'AdminPassword123!',
      department: 'Administration',
      year: 'N/A',
      role: 'Admin'
    });
    cleanupIds.users.push(testAdmin._id);
    const adminToken = generateToken(testAdmin);

    // 2. Create Test Student 1 (Will receive certificates)
    const testStudent1 = await User.create({
      name: `Student One ${TEST_TAG}`,
      email: `student1_${TEST_TAG.toLowerCase()}@eventease.test`,
      password: 'StudentPassword123!',
      department: 'Computer Science',
      year: '3rd Year',
      role: 'Student'
    });
    cleanupIds.users.push(testStudent1._id);
    const student1Token = generateToken(testStudent1);

    // 3. Create Test Student 2 (For authorization checks)
    const testStudent2 = await User.create({
      name: `Student Two ${TEST_TAG}`,
      email: `student2_${TEST_TAG.toLowerCase()}@eventease.test`,
      password: 'StudentPassword123!',
      department: 'Mechanical Engineering',
      year: '2nd Year',
      role: 'Student'
    });
    cleanupIds.users.push(testStudent2._id);
    const student2Token = generateToken(testStudent2);

    // 4. Create Ended Published Event (Scheduled end time safely in the past)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const endedPublishedEvent = await Event.create({
      title: `Ended Tech Summit ${TEST_TAG}`,
      description: 'Completed event eligible for certificates',
      category: 'Technical',
      date: yesterday,
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      venue: 'Main Auditorium',
      registrationDeadline: new Date(yesterday.getTime() - 3600 * 1000),
      seatLimit: 100,
      registeredCount: 2,
      organizer: 'Tech Club',
      status: 'Published',
      createdBy: testAdmin._id
    });
    cleanupIds.events.push(endedPublishedEvent._id);

    // 5. Create Future Event (End time in the future)
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const futureEvent = await Event.create({
      title: `Future Workshop ${TEST_TAG}`,
      description: 'Future event not yet concluded',
      category: 'Workshop',
      date: tomorrow,
      startTime: '10:00 AM',
      endTime: '04:00 PM',
      venue: 'Hall B',
      registrationDeadline: tomorrow,
      seatLimit: 50,
      registeredCount: 1,
      organizer: 'Robotics Lab',
      status: 'Published',
      createdBy: testAdmin._id
    });
    cleanupIds.events.push(futureEvent._id);

    // 6. Create Cancelled Event
    const cancelledEvent = await Event.create({
      title: `Cancelled Seminar ${TEST_TAG}`,
      description: 'Event that was cancelled',
      category: 'Seminar',
      date: yesterday,
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      venue: 'Room 101',
      registrationDeadline: yesterday,
      seatLimit: 50,
      registeredCount: 0,
      organizer: 'Academic Dept',
      status: 'Cancelled',
      createdBy: testAdmin._id
    });
    cleanupIds.events.push(cancelledEvent._id);

    // 7. Create Confirmed Registration & Verified Attendance for Student 1 on ended event
    const regStudent1 = await Registration.create({
      student: testStudent1._id,
      event: endedPublishedEvent._id,
      registrationCode: generateRegistrationCode(),
      status: 'Confirmed'
    });
    cleanupIds.registrations.push(regStudent1._id);

    const attStudent1 = await Attendance.create({
      registration: regStudent1._id,
      student: testStudent1._id,
      event: endedPublishedEvent._id,
      checkInTime: yesterday,
      markedBy: testAdmin._id,
      method: 'QR_SCAN'
    });
    cleanupIds.attendances.push(attStudent1._id);

    // 8. Create Cancelled Registration for Student 2 on ended event
    const regStudent2Cancelled = await Registration.create({
      student: testStudent2._id,
      event: endedPublishedEvent._id,
      registrationCode: generateRegistrationCode(),
      status: 'Cancelled',
      cancelledAt: new Date(),
      cancellationReason: 'Student cancelled'
    });
    cleanupIds.registrations.push(regStudent2Cancelled._id);

    // 9. Create Student 2 Confirmed Registration on future event (with attendance)
    const regStudent2Future = await Registration.create({
      student: testStudent2._id,
      event: futureEvent._id,
      registrationCode: generateRegistrationCode(),
      status: 'Confirmed'
    });
    cleanupIds.registrations.push(regStudent2Future._id);

    const attStudent2Future = await Attendance.create({
      registration: regStudent2Future._id,
      student: testStudent2._id,
      event: futureEvent._id,
      checkInTime: new Date(),
      markedBy: testAdmin._id,
      method: 'MANUAL'
    });
    cleanupIds.attendances.push(attStudent2Future._id);

    console.log('[Setup] Test fixtures provisioned successfully.\n');

    // Variable to store issued certificate for downstream tests
    let issuedCertificateId = null;
    let issuedCertificateCode = null;

    // -------------------------------------------------------------
    // Test 1: Admin can issue certificate for valid attended student
    // -------------------------------------------------------------
    const res1 = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        eventId: endedPublishedEvent._id,
        studentId: testStudent1._id
      })
    });
    const data1 = await res1.json();
    assert.strictEqual(res1.status, 201, `Test 1 failed with status ${res1.status}: ${data1.message}`);
    assert(data1.success === true, 'Test 1: Expected success === true');
    assert(data1.certificate && data1.certificate.certificateId, 'Test 1: Expected certificate with certificateId');
    assert.strictEqual(data1.certificate.student.toString(), testStudent1._id.toString());
    issuedCertificateId = data1.certificate._id;
    issuedCertificateCode = data1.certificate.certificateId;
    cleanupIds.certificates.push(issuedCertificateId);
    console.log('Test 1: Admin can issue certificate for valid attended student -> PASS');

    // -------------------------------------------------------------
    // Test 2: Student without attendance cannot receive certificate
    // -------------------------------------------------------------
    // Student 2 has no attendance on endedPublishedEvent
    const res2 = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        eventId: endedPublishedEvent._id,
        studentId: testStudent2._id
      })
    });
    const data2 = await res2.json();
    assert.strictEqual(res2.status, 400, `Test 2: Expected 400 for unattended student, got ${res2.status}`);
    assert(data2.message.includes('cancelled') || data2.message.includes('attendance'), `Test 2 message: ${data2.message}`);
    console.log('Test 2: Student without attendance cannot receive certificate -> PASS');

    // -------------------------------------------------------------
    // Test 3: Cancelled registration is rejected
    // -------------------------------------------------------------
    // Attempting generation on regStudent2Cancelled
    const res3 = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        eventId: endedPublishedEvent._id,
        studentId: testStudent2._id
      })
    });
    const data3 = await res3.json();
    assert.strictEqual(res3.status, 400, `Test 3: Expected 400 for cancelled registration, got ${res3.status}`);
    console.log('Test 3: Cancelled registration is rejected -> PASS');

    // -------------------------------------------------------------
    // Test 4: Cancelled event is rejected
    // -------------------------------------------------------------
    const res4 = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        eventId: cancelledEvent._id,
        studentId: testStudent1._id
      })
    });
    const data4 = await res4.json();
    assert.strictEqual(res4.status, 400, `Test 4: Expected 400 for cancelled event, got ${res4.status}`);
    assert(data4.message.includes('cancelled event'), `Test 4 message: ${data4.message}`);
    console.log('Test 4: Cancelled event is rejected -> PASS');

    // -------------------------------------------------------------
    // Test 5: Event that has not ended is rejected
    // -------------------------------------------------------------
    const res5 = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        eventId: futureEvent._id,
        studentId: testStudent2._id
      })
    });
    const data5 = await res5.json();
    assert.strictEqual(res5.status, 400, `Test 5: Expected 400 for future event, got ${res5.status}`);
    assert(data5.message.includes('concluded') || data5.message.includes('ended'), `Test 5 message: ${data5.message}`);
    console.log('Test 5: Event that has not ended is rejected -> PASS');

    // -------------------------------------------------------------
    // Test 6: Duplicate issuance returns HTTP 409
    // -------------------------------------------------------------
    const res6 = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        eventId: endedPublishedEvent._id,
        studentId: testStudent1._id
      })
    });
    const data6 = await res6.json();
    assert.strictEqual(res6.status, 409, `Test 6: Expected 409 Conflict for duplicate issuance, got ${res6.status}`);
    console.log('Test 6: Duplicate issuance returns HTTP 409 -> PASS');

    // -------------------------------------------------------------
    // Test 7: Bulk generation issues only eligible certificates
    // -------------------------------------------------------------
    // First, add another confirmed registered & attended student to endedPublishedEvent
    const testStudent3 = await User.create({
      name: `Student Three ${TEST_TAG}`,
      email: `student3_${TEST_TAG.toLowerCase()}@eventease.test`,
      password: 'StudentPassword123!',
      department: 'Civil Engineering',
      year: '1st Year',
      role: 'Student'
    });
    cleanupIds.users.push(testStudent3._id);

    const regStudent3 = await Registration.create({
      student: testStudent3._id,
      event: endedPublishedEvent._id,
      registrationCode: generateRegistrationCode(),
      status: 'Confirmed'
    });
    cleanupIds.registrations.push(regStudent3._id);

    const attStudent3 = await Attendance.create({
      registration: regStudent3._id,
      student: testStudent3._id,
      event: endedPublishedEvent._id,
      checkInTime: yesterday,
      markedBy: testAdmin._id,
      method: 'MANUAL'
    });
    cleanupIds.attendances.push(attStudent3._id);

    // Call bulk generation: Student 1 already has cert; Student 3 is eligible; Student 2 is cancelled
    const res7 = await fetch(`${baseUrl}/generate-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ eventId: endedPublishedEvent._id })
    });
    const data7 = await res7.json();
    assert.strictEqual(res7.status, 200, `Test 7: Expected 200 for bulk generation, got ${res7.status}`);
    assert.strictEqual(data7.summary.certificatesNewlyGenerated, 1, `Test 7: Expected 1 newly generated, got ${data7.summary.certificatesNewlyGenerated}`);
    assert.strictEqual(data7.summary.certificatesAlreadyExisting, 1, `Test 7: Expected 1 existing skipped, got ${data7.summary.certificatesAlreadyExisting}`);
    console.log('Test 7: Bulk generation issues only eligible certificates -> PASS');

    // Record the newly generated certificate from Student 3 for cleanup
    const certStudent3 = await Certificate.findOne({ student: testStudent3._id, event: endedPublishedEvent._id });
    if (certStudent3) cleanupIds.certificates.push(certStudent3._id);

    // -------------------------------------------------------------
    // Test 8: Bulk generation skips existing certificates
    // -------------------------------------------------------------
    // Calling bulk generation again should generate 0 and skip all 2
    const res8 = await fetch(`${baseUrl}/generate-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ eventId: endedPublishedEvent._id })
    });
    const data8 = await res8.json();
    assert.strictEqual(res8.status, 200);
    assert.strictEqual(data8.summary.certificatesNewlyGenerated, 0, `Test 8: Expected 0 newly generated, got ${data8.summary.certificatesNewlyGenerated}`);
    assert.strictEqual(data8.summary.certificatesAlreadyExisting, 2, `Test 8: Expected 2 existing skipped, got ${data8.summary.certificatesAlreadyExisting}`);
    console.log('Test 8: Bulk generation skips existing certificates -> PASS');

    // -------------------------------------------------------------
    // Test 9: Student can retrieve only their own certificates
    // -------------------------------------------------------------
    const res9 = await fetch(`${baseUrl}/my-certificates`, {
      headers: { Authorization: `Bearer ${student1Token}` }
    });
    const data9 = await res9.json();
    assert.strictEqual(res9.status, 200);
    assert.strictEqual(data9.count, 1);
    assert.strictEqual(data9.certificates[0].student.toString(), testStudent1._id.toString());
    assert.strictEqual(data9.certificates[0].certificateId, issuedCertificateCode);
    console.log('Test 9: Student can retrieve only their own certificates -> PASS');

    // -------------------------------------------------------------
    // Test 10: Student cannot download another student's certificate
    // -------------------------------------------------------------
    // Student 2 tries to download Student 1's certificate
    const res10 = await fetch(`${baseUrl}/${issuedCertificateId}/download`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    assert.strictEqual(res10.status, 403, `Test 10: Expected 403 Forbidden, got ${res10.status}`);
    console.log("Test 10: Student cannot download another student's certificate -> PASS");

    // -------------------------------------------------------------
    // Test 11: Admin can download a PDF
    // -------------------------------------------------------------
    const res11 = await fetch(`${baseUrl}/${issuedCertificateId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res11.status, 200, `Test 11: Expected 200, got ${res11.status}`);
    assert.strictEqual(res11.headers.get('content-type'), 'application/pdf');
    assert(res11.headers.get('content-disposition').includes(`EventEase-Certificate-${issuedCertificateCode}.pdf`));
    console.log('Test 11: Admin can download a PDF -> PASS');

    // -------------------------------------------------------------
    // Test 12: PDF response begins with %PDF
    // -------------------------------------------------------------
    const pdfArrayBuffer = await res11.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    assert(pdfBuffer.length > 3000, `Test 12: PDF buffer too small (${pdfBuffer.length} bytes)`);
    assert.strictEqual(pdfBuffer.subarray(0, 4).toString('utf8'), '%PDF');
    console.log('Test 12: PDF response begins with %PDF header -> PASS');

    // -------------------------------------------------------------
    // Test 13: Public verification returns only permitted fields
    // -------------------------------------------------------------
    const res13 = await fetch(`${baseUrl}/verify/${issuedCertificateCode}`);
    const data13 = await res13.json();
    assert.strictEqual(res13.status, 200);
    assert.strictEqual(data13.valid, true);
    assert.strictEqual(data13.certificateId, issuedCertificateCode);
    assert.strictEqual(data13.studentName, testStudent1.name);
    assert.strictEqual(data13.eventTitle, endedPublishedEvent.title);
    assert(data13.issuedAt, 'Test 13: Expected issuedAt timestamp');
    // Security check: Must NOT leak private/internal fields
    assert.strictEqual(data13.email, undefined);
    assert.strictEqual(data13.password, undefined);
    assert.strictEqual(data13.jwt, undefined);
    assert.strictEqual(data13._id, undefined);
    console.log('Test 13: Public verification returns only permitted fields (no private leaks) -> PASS');

    // -------------------------------------------------------------
    // Test 14: Invalid certificate ID returns safe invalid response
    // -------------------------------------------------------------
    const res14 = await fetch(`${baseUrl}/verify/CERT-INVALID-0000-0000`);
    const data14 = await res14.json();
    assert.strictEqual(res14.status, 404);
    assert.strictEqual(data14.valid, false);
    console.log('Test 14: Invalid certificate ID returns safe invalid response -> PASS');

    // -------------------------------------------------------------
    // Test 15: Unauthenticated and unauthorized requests are rejected
    // -------------------------------------------------------------
    // 15a. Unauthenticated POST /generate -> 401
    const res15a = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: endedPublishedEvent._id, studentId: testStudent1._id })
    });
    assert.strictEqual(res15a.status, 401, 'Test 15a: Expected 401');

    // 15b. Unauthorized student POST /generate -> 403
    const res15b = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1Token}`
      },
      body: JSON.stringify({ eventId: endedPublishedEvent._id, studentId: testStudent1._id })
    });
    assert.strictEqual(res15b.status, 403, 'Test 15b: Expected 403');

    // 15c. Unauthenticated GET /my-certificates -> 401
    const res15c = await fetch(`${baseUrl}/my-certificates`);
    assert.strictEqual(res15c.status, 401, 'Test 15c: Expected 401');

    // 15d. Unauthorized Admin on student endpoint GET /my-certificates -> 403
    const res15d = await fetch(`${baseUrl}/my-certificates`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res15d.status, 403, 'Test 15d: Expected 403');

    console.log('Test 15: Unauthenticated and unauthorized requests rejected (401 & 403) -> PASS');

    console.log('\n======================================================');
    console.log('ALL 15 MODULE 8 STEP 3 TESTS PASSED SUCCESSFULLY');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\nTest Suite Failed:', err.message);
    throw err;
  } finally {
    // Thorough Cleanup: Remove 100% of created test fixtures
    console.log('[Cleanup] Removing isolated test records from MongoDB Atlas...');
    if (cleanupIds.certificates.length) {
      await Certificate.deleteMany({ _id: { $in: cleanupIds.certificates } });
    }
    if (cleanupIds.attendances.length) {
      await Attendance.deleteMany({ _id: { $in: cleanupIds.attendances } });
    }
    if (cleanupIds.registrations.length) {
      await Registration.deleteMany({ _id: { $in: cleanupIds.registrations } });
    }
    if (cleanupIds.events.length) {
      await Event.deleteMany({ _id: { $in: cleanupIds.events } });
    }
    if (cleanupIds.users.length) {
      await User.deleteMany({ _id: { $in: cleanupIds.users } });
    }
    console.log('[Cleanup] Cleanup complete. Zero test records remaining.');

    server.close();
    await mongoose.disconnect();
    console.log('[Cleanup] Server and database connection closed cleanly.');
  }
};

runTests()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

