/**
 * EventEase Master Automated Test Runner
 * File: backend/src/scripts/runAllTests.js
 *
 * Runs all active automated test suites in sequence:
 * 1. Rate Limiting Suite (backend/src/scripts/testRateLimiting.js)
 * 2. Attendance Test Suite (backend/src/scripts/testAttendanceSuite.js)
 * 3. Certificate & Release Test Suite (backend/src/scripts/testCertificateSuite.js)
 *
 * Exits with code 0 if all test suites pass, or code 1 if any suite encounters failures.
 */

const { spawn } = require('child_process');
const path = require('path');

const suites = [
  {
    name: 'Rate Limiting Suite',
    script: path.resolve(__dirname, 'testRateLimiting.js')
  },
  {
    name: 'Attendance Automated Suite (Module 1)',
    script: path.resolve(__dirname, 'testAttendanceSuite.js')
  },
  {
    name: 'Certificate & Release Suite (Module 2 & 3)',
    script: path.resolve(__dirname, 'testCertificateSuite.js')
  }
];

const runSuite = (suite) => {
  return new Promise((resolve) => {
    console.log(`\n======================================================`);
    console.log(`RUNNING SUITE: ${suite.name}`);
    console.log(`Script: ${suite.script}`);
    console.log(`======================================================\n`);

    const child = spawn(process.execPath, [suite.script], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../../..')
    });

    child.on('close', (code) => {
      resolve({
        name: suite.name,
        passed: code === 0,
        exitCode: code
      });
    });

    child.on('error', (err) => {
      console.error(`Failed to launch ${suite.name}:`, err);
      resolve({
        name: suite.name,
        passed: false,
        exitCode: 1,
        error: err.message
      });
    });
  });
};

const runAll = async () => {
  console.log('######################################################');
  console.log('# EventEase Master Automated Regression Test Runner   #');
  console.log('######################################################');

  const startTime = Date.now();
  const results = [];

  for (const suite of suites) {
    const res = await runSuite(suite);
    results.push(res);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalSuites = results.length;
  const passedSuites = results.filter((r) => r.passed).length;
  const failedSuites = results.filter((r) => !r.passed).length;

  console.log('\n######################################################');
  console.log('# MASTER REGRESSION SUMMARY                          #');
  console.log('######################################################');
  console.log(`Execution Time: ${duration}s`);
  console.log(`Total Suites:   ${totalSuites}`);
  console.log(`Passed Suites:  ${passedSuites}`);
  console.log(`Failed Suites:  ${failedSuites}\n`);

  results.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.passed ? 'PASSED' : 'FAILED'}] ${r.name} (exit code ${r.exitCode})`);
  });
  console.log('######################################################\n');

  if (failedSuites > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runAll();

