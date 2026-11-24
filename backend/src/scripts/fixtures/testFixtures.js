/**
 * EventEase Isolated Test Fixtures Architecture
 * File: backend/src/scripts/fixtures/testFixtures.js
 *
 * Provisions isolated test fixtures against a dedicated test database (eventease_isolated_test_db).
 * Never mutates or performs destructive cleanup on the production database or real student accounts.
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const mongoose = require('mongoose');
const User = require('../../models/User');
const { Event } = require('../../models/Event');
const Registration = require('../../models/Registration');
const Attendance = require('../../models/Attendance');
const Certificate = require('../../models/Certificate');
const generateToken = require('../../utils/generateToken');
const { generateRegistrationCode } = require('../../utils/generateRegistrationCode');
const { generateCertificateId } = require('../../utils/generateCertificateId');
const { generateQrToken } = require('../../utils/qrToken');

/**
 * Resolves dedicated test database connection URI.
 * Guarantees automated tests execute in 'eventease_isolated_test_db' and never touch production.
 */
const getIsolatedTestDbUri = () => {
  if (process.env.TEST_MONGODB_URI) {
    return process.env.TEST_MONGODB_URI;
  }
  const baseUri = process.env.MONGODB_URI;
  if (!baseUri) {
    throw new Error('Server configuration error: MONGODB_URI is required');
  }

  const isSrv = baseUri.startsWith('mongodb+srv://');
  const protocol = isSrv ? 'mongodb+srv://' : 'mongodb://';
  const stripped = baseUri.replace(/^mongodb(\+srv)?:\/\//, '');
  const parts = stripped.split('/');
  const hostAndAuth = parts[0];
  const rest = parts.slice(1).join('/');
  const queryIndex = rest.indexOf('?');
  const query = queryIndex !== -1 ? rest.substring(queryIndex) : '';

  return `${protocol}${hostAndAuth}/eventease_isolated_test_db${query}`;
};

/**
 * Connects safely to the isolated test database.
 */
const connectTestDb = async () => {
  const uri = getIsolatedTestDbUri();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
  if (mongoose.connection.name !== 'eventease_isolated_test_db') {
    throw new Error(
      `Safety Block: Attempted to run test suite against non-test database: '${mongoose.connection.name}'. Expected 'eventease_isolated_test_db'.`
    );
  }
};

/**
 * Disconnects from the test database.
 */
const disconnectTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

/**
 * Provisions a complete, realistic fixture dataset required by Modules 1, 2, 3, and 4.
 */
const setupTestFixtures = async () => {
  await connectTestDb();

  const tag = `T${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`;

  // 1. Create Admin
  const admin = await User.create({
    name: `Admin ${tag}`,
    email: `admin_${tag.toLowerCase()}@eventease.test`,
    password: `Pass_${tag}_Admin99!`,
    department: 'Administration',
    year: 'N/A',
    role: 'Admin'
  });

  // 2. Create Multiple Students
  // Student 1: Eligible attendee (attended, eligible for cert)
  const student1 = await User.create({
    name: `Student One ${tag}`,
    email: `student1_${tag.toLowerCase()}@eventease.test`,
    password: `Pass_${tag}_Std1!`,
    department: 'Computer Science',
    year: '3rd Year',
    role: 'Student'
  });

  // Student 2: Registered student who has NOT attended
  const student2 = await User.create({
    name: `Student Two ${tag}`,
    email: `student2_${tag.toLowerCase()}@eventease.test`,
    password: `Pass_${tag}_Std2!`,
    department: 'Information Technology',
    year: '2nd Year',
    role: 'Student'
  });

  // Student 3: Cancelled registration student
  const student3 = await User.create({
    name: `Student Three ${tag}`,
    email: `student3_${tag.toLowerCase()}@eventease.test`,
    password: `Pass_${tag}_Std3!`,
    department: 'Electronics',
    year: '4th Year',
    role: 'Student'
  });

  // Student 4: Student with an unreleased certificate (status: 'Generated')
  const student4 = await User.create({
    name: `Student Four ${tag}`,
    email: `student4_${tag.toLowerCase()}@eventease.test`,
    password: `Pass_${tag}_Std4!`,
    department: 'Computer Science',
    year: '3rd Year',
    role: 'Student'
  });

  // Student 5: Student with a released certificate (status: 'Released')
  const student5 = await User.create({
    name: `Student Five ${tag}`,
    email: `student5_${tag.toLowerCase()}@eventease.test`,
    password: `Pass_${tag}_Std5!`,
    department: 'Mechanical',
    year: '1st Year',
    role: 'Student'
  });

  // 3. Create Events
  // Event A: Completed Concluded Event in the past
  const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const concludedEvent = await Event.create({
    title: `Concluded Symposium ${tag}`,
    description: 'A completed college event with verified attendee roster.',
    category: 'Technical',
    date: pastDate,
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    venue: 'Auditorium Hall A',
    registrationDeadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    seatLimit: 100,
    registeredCount: 4,
    organizer: 'CSE Department',
    status: 'Published',
    createdBy: admin._id
  });

  // Event B: Active Upcoming Event with available seats
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
  const activeEvent = await Event.create({
    title: `Upcoming Workshop ${tag}`,
    description: 'An open campus workshop with seat capacity available.',
    category: 'Workshop',
    date: futureDate,
    startTime: '10:00 AM',
    endTime: '04:00 PM',
    venue: 'Lab 301',
    registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    seatLimit: 50,
    registeredCount: 1,
    organizer: 'IEEE Student Branch',
    status: 'Published',
    createdBy: admin._id
  });

  // 4. Create Registrations
  // Reg 1: Student 1 on Concluded Event (Confirmed)
  const reg1 = await Registration.create({
    student: student1._id,
    event: concludedEvent._id,
    registrationCode: generateRegistrationCode(),
    status: 'Confirmed',
    registeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  });

  // Reg 2: Student 2 on Concluded Event (Confirmed, but not attended)
  const reg2 = await Registration.create({
    student: student2._id,
    event: concludedEvent._id,
    registrationCode: generateRegistrationCode(),
    status: 'Confirmed',
    registeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  });

  // Reg 3: Student 3 on Concluded Event (Cancelled registration)
  const reg3 = await Registration.create({
    student: student3._id,
    event: concludedEvent._id,
    registrationCode: generateRegistrationCode(),
    status: 'Cancelled',
    cancellationReason: 'Personal schedule conflict',
    registeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  });

  // Reg 4: Student 4 on Concluded Event (Confirmed)
  const reg4 = await Registration.create({
    student: student4._id,
    event: concludedEvent._id,
    registrationCode: generateRegistrationCode(),
    status: 'Confirmed',
    registeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  });

  // Reg 5: Student 5 on Concluded Event (Confirmed)
  const reg5 = await Registration.create({
    student: student5._id,
    event: concludedEvent._id,
    registrationCode: generateRegistrationCode(),
    status: 'Confirmed',
    registeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  });

  // Reg Active: Student 1 on Active Event
  const regActive = await Registration.create({
    student: student1._id,
    event: activeEvent._id,
    registrationCode: generateRegistrationCode(),
    status: 'Confirmed',
    registeredAt: new Date()
  });

  // 5. Create Attendances
  // Attendance 1: Student 1 (eligible attendee with verified check-in)
  const att1 = await Attendance.create({
    registration: reg1._id,
    student: student1._id,
    event: concludedEvent._id,
    checkInTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
    markedBy: admin._id,
    method: 'QR_SCAN'
  });

  // Attendance 4: Student 4 (for unreleased certificate)
  const att4 = await Attendance.create({
    registration: reg4._id,
    student: student4._id,
    event: concludedEvent._id,
    checkInTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
    markedBy: admin._id,
    method: 'QR_SCAN'
  });

  // Attendance 5: Student 5 (for released certificate)
  const att5 = await Attendance.create({
    registration: reg5._id,
    student: student5._id,
    event: concludedEvent._id,
    checkInTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
    markedBy: admin._id,
    method: 'MANUAL'
  });

  // 6. Create Certificates
  // Certificate 4: Unreleased Certificate (status: 'Generated')
  const unreleasedCert = await Certificate.create({
    certificateId: generateCertificateId(),
    event: concludedEvent._id,
    student: student4._id,
    registration: reg4._id,
    attendance: att4._id,
    issuedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    issuedBy: admin._id,
    status: 'Generated'
  });

  // Certificate 5: Released Certificate (status: 'Released')
  const releasedCert = await Certificate.create({
    certificateId: generateCertificateId(),
    event: concludedEvent._id,
    student: student5._id,
    registration: reg5._id,
    attendance: att5._id,
    issuedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    issuedBy: admin._id,
    status: 'Released',
    releasedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    releasedBy: admin._id
  });

  // 7. Generate JWT Tokens and QR Token
  const tokens = {
    admin: generateToken(admin),
    student1: generateToken(student1),
    student2: generateToken(student2),
    student3: generateToken(student3),
    student4: generateToken(student4),
    student5: generateToken(student5)
  };

  // Valid QR token for Student 1 on Concluded Event
  const validQrTokenStudent1 = generateQrToken({
    registrationId: reg1._id,
    registrationCode: reg1.registrationCode,
    eventId: concludedEvent._id,
    event: concludedEvent
  });

  // Valid QR token for Student 2 on Concluded Event (has not checked in yet)
  const validQrTokenStudent2 = generateQrToken({
    registrationId: reg2._id,
    registrationCode: reg2.registrationCode,
    eventId: concludedEvent._id,
    event: concludedEvent
  });

  // QR token for Student 3 (cancelled registration)
  const qrTokenStudent3Cancelled = generateQrToken({
    registrationId: reg3._id,
    registrationCode: reg3.registrationCode,
    eventId: concludedEvent._id,
    event: concludedEvent
  });

  return {
    tag,
    users: { admin, student1, student2, student3, student4, student5 },
    events: { concludedEvent, activeEvent },
    registrations: { reg1, reg2, reg3, reg4, reg5, regActive },
    attendances: { att1, att4, att5 },
    certificates: { unreleasedCert, releasedCert },
    tokens,
    qrTokens: {
      student1: validQrTokenStudent1,
      student2: validQrTokenStudent2,
      student3Cancelled: qrTokenStudent3Cancelled
    }
  };
};

/**
 * Strict teardown routine: deletes 100% of the fixture records created for this run.
 */
const teardownTestFixtures = async (fixtures) => {
  if (!fixtures) return;

  try {
    const userIds = Object.values(fixtures.users || {}).map((u) => u._id);
    const eventIds = Object.values(fixtures.events || {}).map((e) => e._id);
    const regIds = Object.values(fixtures.registrations || {}).map((r) => r._id);
    const attIds = Object.values(fixtures.attendances || {}).map((a) => a._id);
    const certIds = Object.values(fixtures.certificates || {}).map((c) => c._id);

    await Promise.all([
      Certificate.deleteMany({ _id: { $in: certIds } }),
      Attendance.deleteMany({ _id: { $in: attIds } }),
      Registration.deleteMany({ _id: { $in: regIds } }),
      Event.deleteMany({ _id: { $in: eventIds } }),
      User.deleteMany({ _id: { $in: userIds } })
    ]);
  } catch (err) {
    console.error('[Fixture Teardown Error]:', err.message);
  }
};

module.exports = {
  getIsolatedTestDbUri,
  connectTestDb,
  disconnectTestDb,
  setupTestFixtures,
  teardownTestFixtures
};

