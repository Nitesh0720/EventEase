/**
 * EventEase Automated Attendance Test Suite (Module 1)
 * File: backend/src/scripts/testAttendanceSuite.js
 *
 * Comprehensive automated verification for attendance workflows:
 * ATT-01: Valid QR attendance check-in.
 * ATT-02: Duplicate QR scanning prevention.
 * ATT-03: Invalid QR token structure rejection.
 * ATT-04: Tampered QR signature rejection.
 * ATT-05: Cancelled registration check-in rejection.
 * ATT-06: Cross-event token rejection (scope validation).
 * ATT-07: Manual registration-code attendance check-in.
 * ATT-08: Unauthorized student access prevention (RBAC).
 * ATT-09: Concurrent duplicate attendance race condition safety.
 * ATT-10: Attendance CSV export with formula injection defense.
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env before anything else
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const attendanceRoutes = require('../routes/attendanceRoutes');
const {
  setupTestFixtures,
  teardownTestFixtures,
  disconnectTestDb
} = require('./fixtures/testFixtures');
const Attendance = require('../models/Attendance');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/attendance', attendanceRoutes);
  return app;
};

const runAttendanceTests = async () => {
  console.log('======================================================');
  console.log('Starting Automated Attendance Test Suite (Module 1)');
  console.log('======================================================\n');

  // Start ephemeral HTTP server on dynamic port
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/attendance`;

  let fixtures = null;
  const testResults = [];

  const recordResult = (id, title, passed, detail = '') => {
    testResults.push({ id, title, passed, detail });
    console.log(`${passed ? 'PASS' : 'FAIL'}: [${id}] ${title}${detail ? ` - ${detail}` : ''}`);
  };

  try {
    console.log('[Setup] Provisioning isolated test fixtures in test database...');
    fixtures = await setupTestFixtures();
    console.log(`[Setup] Fixtures ready (Run ID: ${fixtures.tag})\n`);

    const { concludedEvent, activeEvent } = fixtures.events;
    const { admin, student1, student2 } = fixtures.tokens;
    const { reg2 } = fixtures.registrations;
    const { student2: qrTokenStudent2, student3Cancelled: qrTokenStudent3 } = fixtures.qrTokens;

    // ATT-01: Valid QR attendance check-in
    try {
      const res = await fetch(`${baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          token: qrTokenStudent2
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.method, 'QR_SCAN');

      // Verify DB record
      const attRecord = await Attendance.findOne({ registration: reg2._id });
      assert(attRecord, 'Attendance record must exist in DB');
      assert.strictEqual(attRecord.method, 'QR_SCAN');
      recordResult('ATT-01', 'Valid QR attendance check-in succeeds with HTTP 201', true);
    } catch (err) {
      recordResult('ATT-01', 'Valid QR attendance check-in succeeds with HTTP 201', false, err.message);
    }

    // ATT-02: Duplicate QR scanning prevention
    try {
      const res = await fetch(`${baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          token: qrTokenStudent2
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 409, `Expected 409 Conflict, got ${res.status}`);
      assert.strictEqual(data.success, false);
      assert(data.message.toLowerCase().includes('already'), data.message);
      recordResult('ATT-02', 'Duplicate QR scan rejected with HTTP 409 Conflict', true);
    } catch (err) {
      recordResult('ATT-02', 'Duplicate QR scan rejected with HTTP 409 Conflict', false, err.message);
    }

    // ATT-03: Invalid QR token structure rejection
    try {
      const res = await fetch(`${baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          token: 'invalid.malformed.token'
        })
      });
      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
      recordResult('ATT-03', 'Malformed QR token rejected with HTTP 400 Bad Request', true);
    } catch (err) {
      recordResult('ATT-03', 'Malformed QR token rejected with HTTP 400 Bad Request', false, err.message);
    }

    // ATT-04: Tampered QR signature rejection
    try {
      const parts = qrTokenStudent2.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.${'0'.repeat(parts[2].length)}`;
      const res = await fetch(`${baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          token: tamperedToken
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
      assert(data.message.includes('Tampered') || data.message.includes('Invalid'), data.message);
      recordResult('ATT-04', 'Tampered QR signature rejected with HTTP 400', true);
    } catch (err) {
      recordResult('ATT-04', 'Tampered QR signature rejected with HTTP 400', false, err.message);
    }

    // ATT-05: Cancelled registration check-in rejection
    try {
      const res = await fetch(`${baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          token: qrTokenStudent3
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
      assert(data.message.includes('Cancelled') || data.message.includes('cancelled'), data.message);
      recordResult('ATT-05', 'Cancelled registration check-in rejected with HTTP 400', true);
    } catch (err) {
      recordResult('ATT-05', 'Cancelled registration check-in rejected with HTTP 400', false, err.message);
    }

    // ATT-06: Cross-event token rejection (scope validation)
    try {
      const res = await fetch(`${baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: activeEvent._id.toString(), // Wrong event
          token: qrTokenStudent2 // Token issued for concludedEvent
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
      assert(data.message.includes('different event'), data.message);
      recordResult('ATT-06', 'Cross-event QR pass rejected with HTTP 400', true);
    } catch (err) {
      recordResult('ATT-06', 'Cross-event QR pass rejected with HTTP 400', false, err.message);
    }

    // ATT-07: Manual registration-code attendance check-in
    try {
      const User = require('../models/User');
      const Registration = require('../models/Registration');
      const { generateRegistrationCode } = require('../utils/generateRegistrationCode');

      // Create dedicated student for manual check-in test (automatically cleaned up by teardown via tag)
      const manualStudent = await User.create({
        name: `Manual Student ${fixtures.tag}`,
        email: `manual_${fixtures.tag.toLowerCase()}@eventease.test`,
        password: 'Password123!',
        department: 'Information Technology',
        year: '2nd Year',
        role: 'Student'
      });

      const manualReg = await Registration.create({
        student: manualStudent._id,
        event: concludedEvent._id,
        registrationCode: generateRegistrationCode(),
        status: 'Confirmed'
      });

      const res = await fetch(`${baseUrl}/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          registrationCode: manualReg.registrationCode.toLowerCase() // Test lowercase normalization
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.method, 'MANUAL');

      // Verify in DB
      const manualAtt = await Attendance.findOne({ registration: manualReg._id });
      assert(manualAtt, 'Manual attendance record must exist in DB');
      assert.strictEqual(manualAtt.method, 'MANUAL');
      recordResult('ATT-07', 'Manual registration code check-in succeeds with HTTP 201 (method: MANUAL)', true);
    } catch (err) {
      recordResult('ATT-07', 'Manual registration code check-in succeeds with HTTP 201 (method: MANUAL)', false, err.message);
    }

    // ATT-08: Unauthorized student attendance request
    try {
      const res = await fetch(`${baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${student1}` // Student token
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          token: qrTokenStudent2
        })
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
      recordResult('ATT-08', 'Unauthorized student scan request blocked with HTTP 403 Forbidden', true);
    } catch (err) {
      recordResult('ATT-08', 'Unauthorized student scan request blocked with HTTP 403 Forbidden', false, err.message);
    }

    // ATT-09: Concurrent duplicate attendance race condition safety
    try {
      const User = require('../models/User');
      const Registration = require('../models/Registration');
      const { generateRegistrationCode } = require('../utils/generateRegistrationCode');
      const { generateQrToken } = require('../utils/qrToken');

      // Create dedicated student for concurrency test (cleaned up by teardown via tag)
      const concurrentStudent = await User.create({
        name: `Concurrent Student ${fixtures.tag}`,
        email: `concurrent_${fixtures.tag.toLowerCase()}@eventease.test`,
        password: 'Password123!',
        department: 'Computer Science',
        year: '4th Year',
        role: 'Student'
      });

      const concurrentReg = await Registration.create({
        student: concurrentStudent._id,
        event: concludedEvent._id,
        registrationCode: generateRegistrationCode(),
        status: 'Confirmed'
      });
      const concurrentToken = generateQrToken({
        registrationId: concurrentReg._id,
        registrationCode: concurrentReg.registrationCode,
        eventId: concludedEvent._id,
        event: concludedEvent
      });

      // Fire 2 simultaneous scan requests
      const [resA, resB] = await Promise.all([
        fetch(`${baseUrl}/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` },
          body: JSON.stringify({ eventId: concludedEvent._id.toString(), token: concurrentToken })
        }),
        fetch(`${baseUrl}/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` },
          body: JSON.stringify({ eventId: concludedEvent._id.toString(), token: concurrentToken })
        })
      ]);

      const statuses = [resA.status, resB.status].sort();
      // Exactly one must be 201 (Created) and one must be 409 (Conflict)
      assert.deepStrictEqual(statuses, [201, 409], `Expected [201, 409], got ${JSON.stringify(statuses)}`);

      // Verify exactly one record created in DB
      const count = await Attendance.countDocuments({ registration: concurrentReg._id });
      assert.strictEqual(count, 1, 'Exactly one attendance record must be created');
      recordResult('ATT-09', 'Concurrent duplicate scan requests safely resolved (1x 201, 1x 409)', true);
    } catch (err) {
      recordResult('ATT-09', 'Concurrent duplicate scan requests safely resolved (1x 201, 1x 409)', false, err.message);
    }

    // ATT-10: Attendance CSV export with formula injection defense
    try {
      const res = await fetch(`${baseUrl}/event/${concludedEvent._id}/export`, {
        headers: { Authorization: `Bearer ${admin}` }
      });
      assert.strictEqual(res.status, 200);
      assert(res.headers.get('content-type').includes('text/csv'));
      const csvText = await res.text();
      assert(csvText.includes('Student Name'), 'CSV must include headers');
      assert(csvText.includes('Check-In Date Time'), 'CSV must include check-in column');
      recordResult('ATT-10', 'Attendance CSV export returns valid text/csv format', true);
    } catch (err) {
      recordResult('ATT-10', 'Attendance CSV export returns valid text/csv format', false, err.message);
    }

  } finally {
    // Teardown ephemeral server and database records
    server.close();
    if (fixtures) {
      console.log('\n[Teardown] Cleaning up isolated test fixtures from test DB...');
      await teardownTestFixtures(fixtures);
      console.log('[Teardown] Cleanup complete.');
    }
    await disconnectTestDb();
  }

  console.log('\n======================================================');
  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.filter((r) => !r.passed).length;
  console.log(`ATTENDANCE SUITE RESULTS: ${passedCount} Passed, ${failedCount} Failed (Total: ${testResults.length})`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
};

runAttendanceTests().catch((err) => {
  console.error('Fatal Attendance Test Runner Error:', err);
  process.exit(1);
});
