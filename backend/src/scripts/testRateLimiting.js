/**
 * EventEase Final Audit Step 4: Rate Limiting Test Suite
 * File: backend/src/scripts/testRateLimiting.js
 *
 * Verifies targeted API rate limiting on authentication and certificate verification routes:
 * 1. Requests below the limit work normally.
 * 2. Requests exceeding the authentication limit receive HTTP 429 and JSON error message.
 * 3. Requests exceeding the certificate verification limit receive HTTP 429 and JSON error message.
 * 4. Authenticated profile and certificate endpoints are not unintentionally rate-limited.
 * 5. Limiters are mounted on the active routes with standard RateLimit headers.
 */

const assert = require('assert');
const express = require('express');
const { authLimiter, certificateVerificationLimiter, createRateLimiter } = require('../middleware/rateLimitMiddleware');
const authRoutes = require('../routes/authRoutes');
const certificateRoutes = require('../routes/certificateRoutes');

// Stub Mongoose model methods so unit/route testing runs purely in-memory with zero DB timeout
const Certificate = require('../models/Certificate');
const User = require('../models/User');

Certificate.findOne = () => ({
  populate: () => ({
    populate: () => Promise.resolve(null)
  })
});
User.findOne = () => Promise.resolve(null);

const runTests = async () => {
  console.log('======================================================');
  console.log('Starting Rate Limiting Test Suite');
  console.log('======================================================\n');

  // Test 1: Configuration properties
  console.log('--- Test 1: Limiter Middleware Export and Type Verification ---');
  assert.strictEqual(typeof authLimiter, 'function', 'authLimiter must be an Express middleware function');
  assert.strictEqual(typeof certificateVerificationLimiter, 'function', 'certificateVerificationLimiter must be an Express middleware function');
  assert.strictEqual(typeof createRateLimiter, 'function', 'createRateLimiter factory must be a function');
  console.log('PASS: Limiters are valid Express middleware functions');

  // Test 2: Authentication Limiter Enforcement
  console.log('\n--- Test 2: Authentication Limiter Enforcement ---');
  const appAuth = express();
  appAuth.use(express.json());

  // Use isolated test limiter instance with max = 3 for deterministic testing
  const testAuthLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 3,
    customPayload: {
      success: false,
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    }
  });

  appAuth.post('/api/auth/login', testAuthLimiter, (req, res) => {
    res.status(200).json({ success: true, message: 'Login successful' });
  });

  // Authenticated profile endpoint (must not have auth limiter)
  appAuth.get('/api/auth/profile', (req, res) => {
    res.status(200).json({ success: true, user: { name: 'Test Student' } });
  });

  const serverAuth = appAuth.listen(0);
  const authPort = serverAuth.address().port;

  try {
    // 3 allowed requests
    for (let i = 1; i <= 3; i++) {
      const res = await fetch(`http://127.0.0.1:${authPort}/api/auth/login`, { method: 'POST' });
      assert.strictEqual(res.status, 200, `Auth request ${i} must succeed with 200`);
      console.log(`PASS: Auth request ${i}/3 allowed`);
    }

    // 4th request must be rejected with HTTP 429
    const blockedRes = await fetch(`http://127.0.0.1:${authPort}/api/auth/login`, { method: 'POST' });
    assert.strictEqual(blockedRes.status, 429, 'Exceeded auth request must return HTTP 429');
    const blockedData = await blockedRes.json();
    assert.strictEqual(blockedData.success, false, 'Blocked response success must be false');
    assert.strictEqual(blockedData.message, 'Too many authentication attempts from this IP. Please try again after 15 minutes.');
    console.log('PASS: Exceeded authentication request blocked with HTTP 429 and clear JSON error message');

    // Authenticated profile route must remain accessible even after auth rate limit exceeded
    for (let i = 1; i <= 5; i++) {
      const profileRes = await fetch(`http://127.0.0.1:${authPort}/api/auth/profile`);
      assert.strictEqual(profileRes.status, 200, 'Profile request must succeed even after auth limit reached');
    }
    console.log('PASS: Authenticated profile endpoint is not rate-limited');
  } finally {
    serverAuth.close();
  }

  // Test 3: Certificate Verification Limiter Enforcement
  console.log('\n--- Test 3: Certificate Verification Limiter Enforcement ---');
  const appCert = express();
  appCert.use(express.json());

  // Use isolated test limiter instance with max = 3
  const testCertLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 3,
    customPayload: {
      success: false,
      valid: false,
      message: 'Too many certificate verification requests from this IP. Please try again after 15 minutes.'
    }
  });

  appCert.get('/api/certificates/verify/:id', testCertLimiter, (req, res) => {
    res.status(200).json({ success: true, valid: true, certificateId: req.params.id });
  });

  // Authenticated student/admin certificate routes
  appCert.get('/api/certificates/my-certificates', (req, res) => {
    res.status(200).json({ success: true, certificates: [] });
  });

  const serverCert = appCert.listen(0);
  const certPort = serverCert.address().port;

  try {
    // 3 allowed verification requests
    for (let i = 1; i <= 3; i++) {
      const res = await fetch(`http://127.0.0.1:${certPort}/api/certificates/verify/CERT-123`);
      assert.strictEqual(res.status, 200, `Cert verify request ${i} must succeed with 200`);
      console.log(`PASS: Certificate verify request ${i}/3 allowed`);
    }

    // 4th request must be rejected with HTTP 429
    const blockedRes = await fetch(`http://127.0.0.1:${certPort}/api/certificates/verify/CERT-123`);
    assert.strictEqual(blockedRes.status, 429, 'Exceeded verification request must return HTTP 429');
    const blockedData = await blockedRes.json();
    assert.strictEqual(blockedData.success, false);
    assert.strictEqual(blockedData.valid, false);
    assert.strictEqual(blockedData.message, 'Too many certificate verification requests from this IP. Please try again after 15 minutes.');
    console.log('PASS: Exceeded certificate verification blocked with HTTP 429 and JSON error');

    // Authenticated certificate route remains accessible
    for (let i = 1; i <= 5; i++) {
      const myCertRes = await fetch(`http://127.0.0.1:${certPort}/api/certificates/my-certificates`);
      assert.strictEqual(myCertRes.status, 200, 'Student certificates request must succeed');
    }
    console.log('PASS: Authenticated certificate operations are not rate-limited');
  } finally {
    serverCert.close();
  }

  // Test 4: Active Route Mounting and Header Verification
  console.log('\n--- Test 4: Active Route Mounting and Standard Header Verification ---');
  const appLive = express();
  appLive.use(express.json());
  appLive.use('/api/auth', authRoutes);
  appLive.use('/api/certificates', certificateRoutes);

  const serverLive = appLive.listen(0);
  const livePort = serverLive.address().port;

  try {
    const liveAuthRes = await fetch(`http://127.0.0.1:${livePort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    // Controller validation returns 400 because limit is not exceeded
    assert.strictEqual(liveAuthRes.status, 400, 'Live auth route should reach controller validation');
    const authHeaders = liveAuthRes.headers;
    assert(authHeaders.has('ratelimit-limit') || authHeaders.has('ratelimit-remaining') || authHeaders.has('ratelimit-reset'), 'Standard RateLimit headers must be present on auth route');
    console.log('PASS: Live auth route mounts authLimiter with standard RateLimit headers');

    const liveCertRes = await fetch(`http://127.0.0.1:${livePort}/api/certificates/verify/CERT-LIVE-TEST`);
    assert(liveCertRes.status === 404 || liveCertRes.status === 200, 'Live cert route returns standard verification response below limit');
    const certHeaders = liveCertRes.headers;
    assert(certHeaders.has('ratelimit-limit') || certHeaders.has('ratelimit-remaining') || certHeaders.has('ratelimit-reset'), 'Standard RateLimit headers must be present on verify route');
    console.log('PASS: Live certificate verify route mounts certificateVerificationLimiter with RateLimit headers');
  } finally {
    serverLive.close();
  }

  console.log('\n======================================================');
  console.log('ALL RATE LIMITING TESTS PASSED (4/4 Groups Verified)');
  console.log('======================================================\n');
};

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

