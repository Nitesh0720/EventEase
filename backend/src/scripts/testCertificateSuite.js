/**
 * EventEase Automated Certificate Test Suite (Module 2 & 3)
 * File: backend/src/scripts/testCertificateSuite.js
 *
 * Comprehensive automated verification for certificate workflows:
 * CERT-01: Admin generates individual certificate for eligible student with verified attendance.
 * CERT-02: Admin generates bulk certificates for all attended students.
 * CERT-03: Certificate generation rejected for student without verified attendance.
 * CERT-04: Certificate generation rejected for cancelled or non-registered student.
 * CERT-05: Valid PDF binary generated with valid PDF header (%PDF-1.).
 * CERT-06: Student cannot download unreleased certificate (HTTP 403).
 * CERT-07: Admin can preview/download unreleased certificate (HTTP 200).
 * CERT-08: Admin releases certificates for an event (status -> 'Released').
 * CERT-09: Idempotent release endpoint handles repeated requests cleanly.
 * CERT-10: Student can view and download certificate after release (HTTP 200).
 * CERT-11: Cross-student download access rejected (Student A cannot access Student B's cert).
 * CERT-12: Public verification endpoint returns valid authenticity data.
 * CERT-13: Duplicate certificate generation prevention.
 * CERT-14: Event certificate metrics accuracy (eligible, generated, released, pending).
 */

const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from backend/.env before anything else
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const certificateRoutes = require('../routes/certificateRoutes');
const {
  setupTestFixtures,
  teardownTestFixtures,
  disconnectTestDb
} = require('./fixtures/testFixtures');
const Certificate = require('../models/Certificate');
const { generateCertificatePdf } = require('../utils/generateCertificatePdf');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/certificates', certificateRoutes);
  return app;
};

const runCertificateTests = async () => {
  console.log('======================================================');
  console.log('Starting Automated Certificate Test Suite (Module 2 & 3)');
  console.log('======================================================\n');

  // Start ephemeral HTTP server on dynamic port
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/certificates`;

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

    const { admin, student1, student2, student4, student5 } = fixtures.tokens;
    const { concludedEvent, activeEvent } = fixtures.events;
    const { unreleasedCert, releasedCert } = fixtures.certificates;

    // CERT-01: Admin generates individual certificate for eligible student with verified attendance
    let generatedCertId = null;
    let generatedCertCode = null;
    try {
      const res = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          studentId: fixtures.users.student1._id.toString()
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert(data.certificate, 'Response must include certificate');
      assert.strictEqual(data.certificate.status, 'Generated', 'Newly generated certificate must have status "Generated"');
      assert.strictEqual(data.certificate.student.toString(), fixtures.users.student1._id.toString());
      generatedCertId = data.certificate._id;
      generatedCertCode = data.certificate.certificateId;

      // Verify in DB
      const dbCert = await Certificate.findById(generatedCertId);
      assert(dbCert, 'Certificate must exist in DB');
      assert.strictEqual(dbCert.status, 'Generated');
      recordResult('CERT-01', 'Admin generates individual certificate with status "Generated"', true);
    } catch (err) {
      recordResult('CERT-01', 'Admin generates individual certificate with status "Generated"', false, err.message);
    }

    // CERT-02: Admin generates bulk certificates for all attended students
    try {
      const res = await fetch(`${baseUrl}/generate-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString()
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert(data.summary, 'Bulk response must include summary');
      assert(typeof data.summary.certificatesNewlyGenerated === 'number');
      assert(typeof data.summary.certificatesAlreadyExisting === 'number');
      recordResult('CERT-02', 'Admin generates bulk certificates for attended students', true);
    } catch (err) {
      recordResult('CERT-02', 'Admin generates bulk certificates for attended students', false, err.message);
    }

    // CERT-03: Certificate generation rejected for student without verified attendance
    try {
      const res = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          studentId: fixtures.users.student2._id.toString() // Student 2 has no attendance
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
      assert.strictEqual(data.success, false);
      assert(data.message.toLowerCase().includes('attendance') || data.message.toLowerCase().includes('attended'), data.message);
      recordResult('CERT-03', 'Generation rejected for student without verified attendance', true);
    } catch (err) {
      recordResult('CERT-03', 'Generation rejected for student without verified attendance', false, err.message);
    }

    // CERT-04: Certificate generation rejected for cancelled or non-registered student
    try {
      const res = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          studentId: fixtures.users.student3._id.toString() // Student 3 cancelled
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
      assert.strictEqual(data.success, false);
      recordResult('CERT-04', 'Generation rejected for cancelled or non-registered student', true);
    } catch (err) {
      recordResult('CERT-04', 'Generation rejected for cancelled or non-registered student', false, err.message);
    }

    // CERT-05: Valid PDF binary generated with valid PDF header
    try {
      const pdfBuffer = await generateCertificatePdf({
        certificate: {
          certificateId: 'CERT-2026-TEST-PDF',
          issuedAt: new Date()
        },
        student: fixtures.users.student1,
        event: fixtures.events.concludedEvent
      });
      assert(Buffer.isBuffer(pdfBuffer), 'Result must be a Buffer');
      assert(pdfBuffer.length > 500, 'PDF buffer must be non-empty');
      const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
      assert.strictEqual(pdfHeader, '%PDF-', `Expected %PDF- header, got ${pdfHeader}`);
      recordResult('CERT-05', 'PDF generator produces valid %PDF- binary buffer', true);
    } catch (err) {
      recordResult('CERT-05', 'PDF generator produces valid %PDF- binary buffer', false, err.message);
    }

    // CERT-06: Student cannot download unreleased certificate (HTTP 403)
    try {
      // student4 has unreleasedCert (status: 'Generated')
      const res = await fetch(`${baseUrl}/${unreleasedCert._id}/download`, {
        headers: { Authorization: `Bearer ${student4}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
      assert.strictEqual(data.success, false);
      assert(data.message.toLowerCase().includes('released'), data.message);
      recordResult('CERT-06', 'Student blocked from downloading unreleased certificate (HTTP 403)', true);
    } catch (err) {
      recordResult('CERT-06', 'Student blocked from downloading unreleased certificate (HTTP 403)', false, err.message);
    }

    // CERT-07: Admin can preview/download unreleased certificate (HTTP 200)
    try {
      // Admin downloads unreleasedCert (status: 'Generated')
      const res = await fetch(`${baseUrl}/${unreleasedCert._id}/download`, {
        headers: { Authorization: `Bearer ${admin}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      const contentType = res.headers.get('content-type');
      assert(contentType.includes('application/pdf'), `Expected application/pdf, got ${contentType}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert.strictEqual(buffer.slice(0, 5).toString('ascii'), '%PDF-');
      recordResult('CERT-07', 'Admin can preview unreleased certificate as PDF (HTTP 200)', true);
    } catch (err) {
      recordResult('CERT-07', 'Admin can preview unreleased certificate as PDF (HTTP 200)', false, err.message);
    }

    // CERT-08: Admin releases certificates for an event (status -> 'Released')
    try {
      const res = await fetch(`${baseUrl}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          sendEmail: false
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert(data.summary, 'Release response must include summary');
      assert(data.summary.newlyReleased >= 1, `Expected at least 1 certificate released, got ${data.summary.newlyReleased}`);

      // Verify unreleasedCert in DB is now 'Released'
      const updatedCert = await Certificate.findById(unreleasedCert._id);
      assert.strictEqual(updatedCert.status, 'Released', 'Status must transition to "Released"');
      assert(updatedCert.releasedAt, 'releasedAt timestamp must be recorded');
      assert(updatedCert.releasedBy, 'releasedBy admin must be recorded');
      recordResult('CERT-08', 'Admin releases certificates successfully (status: "Released")', true);
    } catch (err) {
      recordResult('CERT-08', 'Admin releases certificates successfully (status: "Released")', false, err.message);
    }

    // CERT-09: Idempotent release endpoint handles repeated requests cleanly
    try {
      const res = await fetch(`${baseUrl}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          sendEmail: false
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert(data.summary, 'Release response must include summary');
      assert(data.summary.alreadyReleased >= 1, 'Repeated call must report alreadyReleased');
      assert.strictEqual(data.summary.newlyReleased, 0, 'No newly released certificates on immediate second call');
      recordResult('CERT-09', 'Idempotent release handles repeated requests with zero side-effects', true);
    } catch (err) {
      recordResult('CERT-09', 'Idempotent release handles repeated requests with zero side-effects', false, err.message);
    }

    // CERT-10: Student can view and download certificate after release (HTTP 200)
    try {
      // student4 attempts to download now-released certificate
      const res = await fetch(`${baseUrl}/${unreleasedCert._id}/download`, {
        headers: { Authorization: `Bearer ${student4}` }
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK after release, got ${res.status}`);
      const contentType = res.headers.get('content-type');
      assert(contentType.includes('application/pdf'), `Expected application/pdf, got ${contentType}`);

      // Also check my-certificates list
      const listRes = await fetch(`${baseUrl}/my-certificates`, {
        headers: { Authorization: `Bearer ${student4}` }
      });
      const listData = await listRes.json();
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listData.success, true);
      assert(listData.certificates && listData.certificates.some((c) => c._id === unreleasedCert._id.toString()), 'Released cert must be in my-certificates');
      recordResult('CERT-10', 'Student can download and view certificate after release', true);
    } catch (err) {
      recordResult('CERT-10', 'Student can download and view certificate after release', false, err.message);
    }

    // CERT-11: Cross-student download access rejected (Student A cannot access Student B's cert)
    try {
      // student1 attempts to download student5's released certificate
      const res = await fetch(`${baseUrl}/${releasedCert._id}/download`, {
        headers: { Authorization: `Bearer ${student1}` } // Not the owner
      });
      const data = await res.json();
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden for cross-student download, got ${res.status}`);
      assert.strictEqual(data.success, false);
      recordResult('CERT-11', 'Cross-student download access rejected with HTTP 403', true);
    } catch (err) {
      recordResult('CERT-11', 'Cross-student download access rejected with HTTP 403', false, err.message);
    }

    // CERT-12A: Released certificate public verification (isReleased: true, status: 'Released')
    try {
      const res = await fetch(`${baseUrl}/verify/${releasedCert.certificateId}`);
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.valid, true);
      assert.strictEqual(data.isReleased, true, 'Released certificate must have isReleased: true');
      assert.strictEqual(data.status, 'Released');
      assert.strictEqual(data.certificateId, releasedCert.certificateId);
      assert(data.studentName, 'Student name must be populated');
      assert(data.eventTitle, 'Event title must be populated');
      recordResult('CERT-12A', 'Public verification for Released certificate (isReleased: true, status: "Released")', true);
    } catch (err) {
      recordResult('CERT-12A', 'Public verification for Released certificate (isReleased: true, status: "Released")', false, err.message);
    }

    // CERT-12B: Generated (unreleased) certificate public verification (isReleased: false, status: 'Generated')
    try {
      // Revert generatedCert to 'Generated' status to test unreleased verification
      await Certificate.findByIdAndUpdate(generatedCertId, { status: 'Generated' });
      const res = await fetch(`${baseUrl}/verify/${generatedCertCode}`);
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.valid, true);
      assert.strictEqual(data.isReleased, false, 'Generated certificate must have isReleased: false');
      assert.strictEqual(data.status, 'Generated', 'Status must be "Generated"');
      assert(data.message.toLowerCase().includes('pending'), 'Message must indicate pending release');
      recordResult('CERT-12B', 'Public verification for Generated certificate (isReleased: false, status: "Generated")', true);
    } catch (err) {
      recordResult('CERT-12B', 'Public verification for Generated certificate (isReleased: false, status: "Generated")', false, err.message);
    }

    // CERT-12C: Legacy certificate without status field defaults to Released
    try {
      // Remove status field from DB to simulate legacy certificate
      await Certificate.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(generatedCertId) },
        { $unset: { status: 1 } }
      );
      const res = await fetch(`${baseUrl}/verify/${generatedCertCode}`);
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.valid, true);
      assert.strictEqual(data.isReleased, true, 'Legacy certificate must have isReleased: true');
      assert.strictEqual(data.status, 'Released', 'Legacy certificate status must default to "Released"');
      // Restore status to 'Released'
      await Certificate.findByIdAndUpdate(generatedCertId, { status: 'Released' });
      recordResult('CERT-12C', 'Public verification for Legacy certificate without status (defaults to Released)', true);
    } catch (err) {
      recordResult('CERT-12C', 'Public verification for Legacy certificate without status (defaults to Released)', false, err.message);
    }

    // CERT-12D: Invalid or nonexistent certificate ID rejection (HTTP 404, valid: false, isReleased: false)
    try {
      const res = await fetch(`${baseUrl}/verify/CERT-NONEXISTENT-9999`);
      const data = await res.json();
      assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.valid, false, 'Invalid certificate must have valid: false');
      assert.strictEqual(data.isReleased, false, 'Invalid certificate must have isReleased: false');
      assert(data.message.toLowerCase().includes('not found') || data.message.toLowerCase().includes('invalid'));
      recordResult('CERT-12D', 'Public verification for Invalid certificate ID (HTTP 404, valid: false, isReleased: false)', true);
    } catch (err) {
      recordResult('CERT-12D', 'Public verification for Invalid certificate ID (HTTP 404, valid: false, isReleased: false)', false, err.message);
    }

    // CERT-13: Duplicate certificate generation prevention
    try {
      // Try to re-generate for student 1 (already generated in CERT-01)
      const res = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin}`
        },
        body: JSON.stringify({
          eventId: concludedEvent._id.toString(),
          studentId: fixtures.users.student1._id.toString()
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 409, `Expected 409 Conflict for duplicate generation, got ${res.status}`);
      assert.strictEqual(data.success, false);
      const certCount = await Certificate.countDocuments({
        event: concludedEvent._id,
        student: fixtures.users.student1._id
      });
      assert.strictEqual(certCount, 1, 'Exactly one certificate document must exist');
      recordResult('CERT-13', 'Duplicate certificate generation prevention verified', true);
    } catch (err) {
      recordResult('CERT-13', 'Duplicate certificate generation prevention verified', false, err.message);
    }

    // CERT-14: Event certificate metrics accuracy (eligible, generated, released, pending)
    try {
      const res = await fetch(`${baseUrl}/event/${concludedEvent._id}`, {
        headers: { Authorization: `Bearer ${admin}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(data.success, true);
      const { stats } = data;
      assert(stats, 'Response must include stats object');
      assert(typeof stats.totalAttendees === 'number', 'stats.totalAttendees must be a number');
      assert(typeof stats.totalCertificates === 'number', 'stats.totalCertificates must be a number');
      assert(typeof stats.generatedCount === 'number', 'stats.generatedCount must be a number');
      assert(typeof stats.releasedCount === 'number', 'stats.releasedCount must be a number');
      assert(typeof stats.pendingCount === 'number', 'stats.pendingCount must be a number');
      assert.strictEqual(stats.totalCertificates, stats.generatedCount + stats.releasedCount);
      recordResult('CERT-14', 'Event certificate metrics report accurate aggregate counts', true);
    } catch (err) {
      recordResult('CERT-14', 'Event certificate metrics report accurate aggregate counts', false, err.message);
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
  console.log(`CERTIFICATE SUITE RESULTS: ${passedCount} Passed, ${failedCount} Failed (Total: ${testResults.length})`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
};

runCertificateTests().catch((err) => {
  console.error('Fatal Certificate Test Runner Error:', err);
  process.exit(1);
});
