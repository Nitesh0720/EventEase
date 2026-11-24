# EventEase - College Event Management System with QR-Based Attendance

## Project Overview

EventEase is a full-stack web platform designed to modernize and streamline college event management. The system simplifies how academic departments, student societies, and campus clubs organize, publicize, and execute events. For students, EventEase provides a centralized discovery portal, instantaneous registration, and digital QR-based event passes. For faculty coordinators and event administrators, it automates attendance logging, verifies participant physical presence through QR scanning, and eliminates manual paperwork.

---

## Problem Statement

Traditional collegiate event management suffers from fragmented processes:
- Disorganized event announcements distributed across messaging groups, social media, and physical posters.
- Time-consuming manual registrations often relying on error-prone spreadsheets.
- Slow and inefficient physical queue management at event venues, relying on manual paper sign-in sheets.
- Inaccurate participation tracking, proxy attendance, and delayed certificate distribution.
- Lack of centralized participation histories for student co-curricular portfolios.

EventEase resolves these challenges by uniting event discovery, automated registration, cryptographically verifiable QR check-ins, and centralized administrative oversight into a cohesive web system.

---

## Project Objectives

1. Centralize Campus Activities: Deliver a single, accessible platform for all collegiate workshops, hackathons, seminars, and cultural festivals.
2. Automate Student Registration: Provide single-click event enrollment with live seat tracking and capacity management.
3. Modernize Attendance via QR Technology: Generate unique digital QR passes for registered attendees to facilitate rapid, contactless venue check-in.
4. Enhance Administrative Efficiency: Equip faculty coordinators with real-time attendance auditing, registration control, and automated activity logging.
5. Robust Authentication and Authorization: Protect administrative workflows and verify student identity through encrypted credentials and role-based access control.
6. Dynamic Event Lifecycle Management: Support drafting, publishing, scheduling, editing, capacity enforcement, and soft-cancellation of campus events.
7. Frictionless Event Discovery: Empower students to browse, search, filter, and inspect detailed schedules, venues, and registration deadlines with live status indicators.
8. Maintain High Code Quality and Separation of Concerns: Architect distinct, decoupled frontend and backend services following industry design standards.

---

## Technology Stack

### Frontend
- Framework: React.js (v18)
- Build Tool: Vite
- Routing: React Router (v6)
- Styling: Bootstrap 5 and Custom Design System
- HTTP Client: Axios (with JWT interceptors)
- QR Code Scanning: HTML5-QRCode (`html5-qrcode`)
- State Management: React Context API (`AuthContext`)
- Language: JavaScript (JSX)

### Backend
- Runtime: Node.js
- Framework: Express.js
- Database: MongoDB Atlas
- Object Data Modeling: Mongoose
- Authentication: JSON Web Tokens (`jsonwebtoken`)
- Cryptography: Password Hashing (`bcryptjs`), HMAC-SHA256 Token Signing
- PDF Generation: PDFKit (`pdfkit`)
- QR Code Generation: QRCode (`qrcode`)
- Email Service: Nodemailer (`nodemailer`)
- Environment Management: Dotenv
- Cross-Origin Resource Sharing: CORS
- Development Process Management: Nodemon

---

## Project Folder Structure

```
EventEase/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Database connection logic
│   │   ├── controllers/
│   │   │   ├── attendanceController.js # Module 7: QR scan and manual attendance tracking and CSV export
│   │   │   ├── authController.js     # Student registration, login, profile logic
│   │   │   ├── certificateController.js # Module 8: Certificate issuance, retrieval, PDF stream, verification
│   │   │   ├── eventController.js    # Event CRUD, discovery, and soft-delete logic
│   │   │   ├── healthController.js   # Health check controller
│   │   │   └── registrationController.js # Module 5: Transactional registration and cancellation logic
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT verification (protect) and role authorization (authorize)
│   │   │   ├── optionalAuth.js       # Optional auth for public/admin visibility differentiation
│   │   │   └── rateLimitMiddleware.js # Targeted API rate limiting for public auth and certificate endpoints
│   │   ├── models/
│   │   │   ├── Attendance.js         # Module 7: Attendance schema with unique registration index
│   │   │   ├── Certificate.js        # Module 8: Certificate schema with unique ID, registration, attendance indexes
│   │   │   ├── Event.js              # Event schema, validation, categories, and statuses
│   │   │   ├── Registration.js       # Module 5: Registration schema with compound unique index
│   │   │   └── User.js               # User schema, bcrypt hook, and methods
│   │   ├── routes/
│   │   │   ├── attendanceRoutes.js   # Module 7: Admin attendance routes
│   │   │   ├── authRoutes.js         # Authentication route definitions
│   │   │   ├── certificateRoutes.js  # Module 8: Certificate management and public verification routes
│   │   │   ├── eventRoutes.js        # Event management and discovery routes
│   │   │   ├── healthRoutes.js       # Health check route definitions
│   │   │   └── registrationRoutes.js # Module 5: Student registration routes
│   │   ├── scripts/
│   │   │   ├── fixtures/
│   │   │   │   └── testFixtures.js   # Isolated disposable fixture factory for automated test suites
│   │   │   ├── runAllTests.js        # Master automated regression test runner
│   │   │   ├── seedAdmin.js          # Initial Admin provisioning script
│   │   │   ├── testAttendanceSuite.js # Module 1: Comprehensive attendance automated test suite
│   │   │   ├── testCertificateSuite.js # Module 2 & 3: Comprehensive certificate and release test suite
│   │   │   └── testRateLimiting.js   # Automated test suite for targeted API rate limiting
│   │   └── utils/
│   │       ├── generateCertificateId.js # Module 8: Cryptographic certificate ID generator (CERT-YYYY-XXXX-XXXX)
│   │       ├── generateCertificatePdf.js # Module 8: Institutional landscape A4 PDF generator with verification QR
│   │       ├── generateQrCode.js     # Module 6: QR code image rendering (Data URL and PNG buffer)
│   │       ├── generateRegistrationCode.js # Module 5: Cryptographic registration code generator
│   │       ├── generateToken.js      # JWT signing helper
│   │       ├── qrToken.js            # Module 6/7: HMAC-SHA256 signed QR pass token creation and verification
│   │       └── sendEmail.js          # Module 6/8: Asynchronous email service for passes and certificates
│   ├── .env                          # Local environment variables (ignored by Git)
│   ├── .env.example                  # Template for environment configuration
│   ├── package.json                  # Backend dependencies and scripts
│   └── server.js                     # Express application entrypoint
├── frontend/
│   ├── src/
│   │   ├── assets/                   # Static assets
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── EventFormModal.jsx # Admin modal for creating and editing events
│   │   │   ├── student/
│   │   │   │   └── DigitalPassModal.jsx # Module 6: Modal for viewing, printing, and downloading QR digital pass
│   │   │   ├── AdminRoute.jsx        # Protected route guard for Admin portal
│   │   │   ├── Footer.jsx            # Application footer component
│   │   │   ├── LoadingSpinner.jsx    # Reusable loading spinner component
│   │   │   ├── Navbar.jsx            # Responsive navigation bar with role-aware links
│   │   │   └── StudentRoute.jsx      # Module 5: Protected route guard for Student portal
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Authentication state provider and hook
│   │   ├── data/
│   │   │   └── sampleEvents.js       # Realistic sample event records for showcase
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx        # Primary layout wrapper
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminAttendancePage.jsx # Module 7: Camera scanner, manual check-in, and attendee roster
│   │   │   │   ├── AdminCertificatesPage.jsx # Module 8: Certificate issuance dashboard and bulk management
│   │   │   │   └── AdminEventsPage.jsx # Admin event management dashboard
│   │   │   ├── student/
│   │   │   │   └── StudentDashboardPage.jsx # Module 5: Student registrations dashboard
│   │   │   ├── EventDetailsPage.jsx  # Event details discovery view
│   │   │   ├── EventsPage.jsx        # Dynamic campus events catalog with search and filters
│   │   │   ├── LandingPage.jsx       # Landing page
│   │   │   ├── LoginPage.jsx         # Sign-in page
│   │   │   ├── NotFoundPage.jsx      # 404 error page
│   │   │   ├── RegisterPage.jsx      # Student registration page
│   │   │   ├── StudentCertificatesPage.jsx # Module 8: Student earned certificates portal with PDF download
│   │   │   └── VerifyCertificatePage.jsx # Module 8: Public certificate verification portal
│   │   ├── services/
│   │   │   └── api.js                # Axios client with JWT request interceptor and API calls
│   │   ├── App.jsx                   # Application router and protected route configuration
│   │   ├── index.css                 # Custom CSS variables and styling
│   │   └── main.jsx                  # React application root mount
│   ├── index.html                    # HTML entrypoint
│   ├── package.json                  # Frontend dependencies and scripts
│   └── vite.config.js                # Vite build configuration (Port 3000)
├── .gitignore                        # Git exclusion rules
└── README.md                         # Project documentation
```

---

## Environment Variables

### Backend Configuration

The backend reads configuration values from `backend/.env`. A sample configuration template is provided in `backend/.env.example`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret_key

# Initial Admin Seeding Configuration
ADMIN_NAME=your_admin_name
ADMIN_EMAIL=your_admin_email@example.com
ADMIN_PASSWORD=your_admin_password_min_8_chars

# Module 6: QR Token Signing Secret (Minimum 32 characters)
QR_SECRET=your_dedicated_tamper_resistant_qr_secret_key_min_32_chars

# Frontend Application Client URL (Verified from vite.config.js port 3000)
CLIENT_URL=http://localhost:3000

# Email Configuration (Nodemailer SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email_address@example.com
SMTP_PASS=your_email_app_password
EMAIL_FROM=EventEase Campus Portal <noreply@eventease.edu>
```

Variable Descriptions:
- `PORT`: Network port on which the Express server listens (default: 5000).
- `MONGODB_URI`: Connection string for MongoDB Atlas or local MongoDB instance.
- `JWT_SECRET`: Cryptographically strong secret key used by `jsonwebtoken` to sign and verify user access tokens.
- `ADMIN_NAME`: Full name of the initial system administrator for seeding.
- `ADMIN_EMAIL`: Institutional email address of the initial system administrator.
- `ADMIN_PASSWORD`: Strong password for the initial system administrator (minimum 8 characters).
- `QR_SECRET`: Dedicated secret key used for HMAC-SHA256 signature generation and validation on QR digital pass tokens.
  > **Important Security Requirement**: `QR_SECRET` must be a separate, dedicated secret key (minimum 32 characters) used strictly for HMAC-SHA256 signature generation and validation of QR pass tokens. It must never be identical to or derived from `JWT_SECRET`.
- `CLIENT_URL`: Origin URL of the frontend client used in email links and QR verification URLs (configured to `http://localhost:3000`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`: SMTP credentials for dispatching email confirmations and certificate awards via Nodemailer.

### Frontend Configuration

The frontend Vite application can optionally read custom API URLs from `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

- `VITE_API_URL`: Base URL of the backend REST API (defaults to `http://localhost:5000/api` if omitted).

---

## Setup and Installation

### Prerequisites
- Node.js (v18.0.0 or higher recommended; verified on v22.17.1)
- npm (v9.0.0 or higher; verified on 10.9.2)
- MongoDB Atlas cluster account (or local MongoDB v6.0+)

### 1. Clone or Open the Repository
```bash
cd EventEase
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Configure local environment variables:
Ensure `backend/.env` exists and contains your database connection string and credentials. If not, copy from the template:
```bash
cp .env.example .env
```

> **MongoDB Atlas Network Access**: Ensure your current public IP address (or `0.0.0.0/0` for development environments) is added to the MongoDB Atlas Network Access IP Access List so your local server can establish connection to the cluster.

Provision the initial Administrator account:
```bash
npm run seed:admin
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd ../frontend
npm install
```

Optionally configure custom environment variables in `frontend/.env` if your backend runs on a non-standard port or domain.

---

## Running the Application

### Running Backend Server
From the `backend` directory:

```bash
# Production mode
npm start

# Development mode (with live reload)
npm run dev
```

The backend server will start on `http://localhost:5000`.

### Backend API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status and uptime health check |
| `POST` | `/api/auth/register` | Public | Registers a new Student account (role forced to `Student`) |
| `POST` | `/api/auth/login` | Public | Authenticates user (Student or Admin) and returns JWT |
| `GET` | `/api/auth/profile` | Protected | Returns the authenticated user's profile |
| `GET` | `/api/events` | Public / Context-Aware | Returns Published events to public/students; all events to Admins. Supports `category` and `search` query parameters |
| `GET` | `/api/events/:id` | Public / Context-Aware | Returns single event details (Published only for public/students; clean 404 for invalid IDs) |
| `POST` | `/api/events` | Admin (`protect`, `authorize('Admin')`) | Creates a new event (validates future dates, deadlines, seat limit) |
| `PUT` | `/api/events/:id` | Admin (`protect`, `authorize('Admin')`) | Updates existing event details (prevents editing cancelled events) |
| `PATCH` | `/api/events/:id/status` | Admin (`protect`, `authorize('Admin')`) | Updates event status (`Draft`, `Published`, `Cancelled`) |
| `DELETE` | `/api/events/:id` | Admin (`protect`, `authorize('Admin')`) | Soft deletes an event by transitioning its status to `Cancelled` |
| `GET` | `/api/registrations/my` | Student (`protect`, `authorize('Student')`) | Returns all event registrations for the authenticated student |
| `GET` | `/api/registrations/check/:eventId` | Student (`protect`, `authorize('Student')`) | Returns registration status for a specific event |
| `GET` | `/api/registrations/:registrationId/pass` | Student (`protect`, `authorize('Student')`) | Module 6: Returns verified digital pass with tamper-resistant HMAC-SHA256 signed QR matrix |
| `POST` | `/api/registrations/:eventId` | Student (`protect`, `authorize('Student')`) | Atomically reserves a seat and creates/reactivates registration using MongoDB ACID transaction |
| `DELETE` | `/api/registrations/:registrationId` | Student (`protect`, `authorize('Student')`) | Atomically releases a reserved seat and marks registration as `Cancelled` using MongoDB ACID transaction |
| `POST` | `/api/attendance/scan` | Admin (`protect`, `authorize('Admin')`) | Module 7: Verifies HMAC QR token, validates attendance window, and records attendee check-in |
| `POST` | `/api/attendance/manual` | Admin (`protect`, `authorize('Admin')`) | Module 7: Records audited manual check-in using normalized registration code |
| `GET` | `/api/attendance/event/:eventId` | Admin (`protect`, `authorize('Admin')`) | Module 7: Retrieves attendee roster for an event with search filtering |
| `GET` | `/api/attendance/event/:eventId/stats` | Admin (`protect`, `authorize('Admin')`) | Module 7: Computes confirmed registered, present, absent, and turnout percentage |
| `GET` | `/api/attendance/event/:eventId/export` | Admin (`protect`, `authorize('Admin')`) | Module 7: Exports attendance roster as RFC 4180 CSV with formula injection defense |
| `POST` | `/api/certificates/generate` | Admin (`protect`, `authorize('Admin')`) | Module 8: Generates an individual Certificate of Participation for an eligible attendee |
| `POST` | `/api/certificates/generate-bulk` | Admin (`protect`, `authorize('Admin')`) | Module 8: Generates certificates in bulk for all eligible attendees of a concluded event |
| `GET` | `/api/certificates/event/:eventId` | Admin (`protect`, `authorize('Admin')`) | Module 8: Retrieves certificate issuance roster for an event |
| `GET` | `/api/certificates/my-certificates` | Student (`protect`, `authorize('Student')`) | Module 8: Retrieves all certificates awarded to the authenticated student |
| `GET` | `/api/certificates/:id/download` | Admin or Owning Student (`protect`) | Module 8: Generates and streams landscape A4 certificate PDF binary buffer |
| `GET` | `/api/certificates/verify/:certificateId` | Public | Module 8: Public authenticity verification of a certificate by ID |

### Running Frontend Development Server
From the `frontend` directory:

```bash
npm run dev
```

The Vite development server will start on:
```
http://localhost:3000
```

### Building Frontend for Production
To verify and compile production-ready assets:
```bash
npm run build
```

---

## Completed Modules

All eight core development modules of EventEase have been fully implemented, tested, and integrated:

1. **Module 1: Project Foundation** - Architecture, Express setup, CORS, database connection, responsive layout, health monitoring.
2. **Module 2: Authentication and Authorization** - User model, bcrypt hashing, JWT tokens, route guards (`protect`, `authorize`), login/register.
3. **Module 3: Event Management** - Event schema, validation, scheduling, CRUD operations, publishing, and soft deletion (`Cancelled`).
4. **Module 4: Event Discovery** - Public catalog, multi-criteria filtering, live search, and dynamic event details view.
5. **Module 5: Event Registration System** - ACID transactional seat reservations, capacity management, cancellation, student dashboard.
6. **Module 6: QR Digital Pass and Email Confirmation** - Tamper-resistant HMAC-SHA256 QR passes, asynchronous email confirmations, offline PNG download.
7. **Module 7: QR-Based Attendance Management** - Camera scanning, manual code entry, attendance window enforcement, live stats, CSV export.
8. **Module 8: Certificate Generation and Download** - PDF generation (`pdfkit`), individual/bulk issuance, email delivery, student portal, public verification.

---

## Development Progress

### Module 1: Project Foundation (Completed)
- Separated frontend and backend architectures.
- Root `.gitignore` configured to exclude sensitive files, logs, builds, and dependencies.
- Backend Express application with CORS, JSON parsing, and `/api/health`.
- Frontend React application with Vite, React Router, and Bootstrap 5.
- Reusable `LoadingSpinner` component and multi-column footer.
- Landing page with hero, statistics strip, 4-stage workflow, and sample featured events.

### Module 2: Authentication and Authorization (Completed)
- Mongoose `User` model with fields: `name`, `email` (normalized, unique index), `password` (hashed via `bcryptjs`), `department`, `year`, and `role` (`Student` or `Admin`).
- Passwords enforced to be a minimum of 8 characters on both frontend and backend.
- Public registration (`POST /api/auth/register`) strictly assigns `role: 'Student'` to prevent privilege escalation.
- Admin creation managed via dedicated seed script (`npm run seed:admin`) requiring `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
- Signed JSON Web Tokens (`JWT_SECRET`) issued upon successful login or registration.
- Route protection middleware (`protect`) and role-based authorization middleware (`authorize`).
- Frontend `AuthContext` with persistent session management via `localStorage` and automatic `Bearer` header attachment.
- Frontend `LoginPage` and `RegisterPage` matching the professional navy/charcoal design system without emojis.
- Navigation bar dynamically displays authenticated user name, role badge, and logout control.

### Module 3: Event Management (Completed)
- Mongoose `Event` model with complete schema validation (`title`, `description`, `category`, `date`, `startTime`, `endTime`, `venue`, `registrationDeadline`, `seatLimit`, `organizer`, `poster`, `status`, `createdBy`).
- Backend date and timeline validation:
  - Event date and start time must be in the future.
  - Registration deadline must be in the future.
  - Registration deadline must be strictly before the event start time.
  - Seat limit must be a positive integer greater than zero.
- Public/Student visibility enforcement: Public visitors and students can only access `Published` events.
- Administrative oversight: Authenticated Admin users can view all events (`Draft`, `Published`, `Cancelled`).
- Administrative authorization: All event mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require `protect` and `authorize('Admin')`. Students attempting to modify events receive `403 Forbidden`.
- Soft deletion: `DELETE /api/events/:id` changes event status to `Cancelled` rather than permanently purging records.
- Status transitions: Validated transitions between `Draft`, `Published`, and `Cancelled` (cancelled events cannot be edited).
- Frontend Admin Portal (`/admin/events`) guarded by `<AdminRoute>` with event table, metrics, search, status filtering, and modal editor (`EventFormModal`).
- Public Events Catalog dynamically connects to `GET /api/events` with clear identification between live database records and fallback demo data.

### Module 4: Event Discovery (Completed)
- Integrated backend ID validation in `getEventById`, returning a clean HTTP `404 Not Found` for malformed or non-ObjectId parameters without causing server exceptions.
- Synchronized multi-criteria filtering: Search keywords (title, organizer, venue) and category filters operate concurrently across catalog datasets.
- One-click filter clearing: Added a responsive "Clear Filters" control that resets active search queries and restores category selections to "All".
- Comprehensive state feedback: Added dedicated loading indicators, match counters, and a clean empty state with a "Clear All Filters" callout.
- Dynamic Event Details Page (`/events/:id`):
  - Displays title, description, category, organizer, venue, schedule, seat limit, and registration deadline.
  - Real-time registration status calculation evaluating the actual deadline timestamp against current system time.
  - Clean breadcrumb navigation (`Home > Events > [Event Title]`).
  - Share Event capability with clipboard copying and toast feedback.
  - Strict separation of official database events from demo showcase fallback records.

### Module 5: Event Registration System (Completed)
- Mongoose `Registration` model with compound unique index on `{ student: 1, event: 1 }`, tracking status (`Confirmed`, `Cancelled`), timestamps, cancellation reasons, and cryptographically secure uppercase alphanumeric registration codes (`REG-YYYY-XXXX-XXXX`).
- Native MongoDB multi-document ACID transactions:
  - New registration: Atomically verifies capacity, increments `Event.registeredCount`, and creates the registration document within a single session transaction.
  - Re-registration: If a student cancels and re-registers, atomically reactivates the existing document (`status: 'Confirmed'`), generates a fresh registration code, updates timestamps, and increments `Event.registeredCount` without index conflict.
  - Cancellation: Atomically verifies ownership and event status, decrements `Event.registeredCount`, and sets `status: 'Cancelled'`.
  - Seat integrity: Registered count is strictly protected from exceeding `seatLimit` or dropping below `0`.
- Authorization and role constraints: All registration endpoints strictly require `protect` and `authorize('Student')`. Administrators are prevented from registering as students.
- Dynamic Event Details Page (`/events/:id`):
  - Real-time seat availability bar and live remaining spots counter.
  - State-driven action button: "Login to Register", "Register for Event", "Already Registered", "Registration Closed", "Event Fully Booked", or Admin advisory notice.
  - In-place cancellation modal for registered students prior to event start.
- Student Registrations Dashboard (`/my-registrations`):
  - Guarded by `<StudentRoute>`.
  - Filter tabs: Upcoming Events, Past Events, and Cancelled Registrations with count pills.
  - Metric summary cards: Total Enrolled, Upcoming, Completed, and Cancelled.
  - Inline cancellation with optional reason input.
- Navigation bar updated with role-aware "My Registrations" link for students.

### Module 6: QR Digital Pass and Email Confirmation (Completed)
- Tamper-Resistant Cryptographic QR Token:
  - Format: `v1.<Base64URL_Payload>.<HMAC_SHA256_Signature_Hex>`.
  - Payload contains minimal necessary identifiers (`v`, `rid`, `rc`, `eid`, `iat`, `exp`), excluding sensitive user passwords and personal data.
  - Signed using Node.js `crypto` with `QR_SECRET` and verified with constant-time comparison `crypto.timingSafeEqual`.
  - Payload incorporates an `exp` expiration timestamp aligned with the event conclusion plus a 24-hour grace buffer for attendance auditing.
- Strict Pass Access Control (`GET /api/registrations/:registrationId/pass`):
  - Enforces student ownership (`registration.student._id === req.user._id`), returning HTTP `403 Forbidden` for unauthorized attempts.
  - Rejects cancelled registrations (`400 Bad Request`).
  - Rejects cancelled events (`400 Bad Request`).
  - Re-registration automatically produces a fresh `registrationCode` and a unique, fresh QR token.
- Non-Blocking Asynchronous Email Confirmation:
  - Dispatched via Nodemailer strictly *after* the database transaction has committed to MongoDB.
  - Delivers formatted HTML notification with event schedule, venue, attendee name, registration code, portal link, and inline CID-embedded QR pass.
  - Failures are caught safely and logged without throwing unhandled exceptions; email transport errors never roll back database seat reservations or affect the HTTP 201 response.
  - Sanitized logging: masks recipient emails and never outputs passwords, email bodies, or secret tokens to system logs.
  - Architectural Note: In-process background delivery runs within the Node.js event loop. If the process terminates before SMTP completion, delivery may be interrupted. In high-concurrency production systems, durable message queues (e.g., BullMQ/Redis or AWS SQS) are recommended.
- Frontend Digital Pass Viewing and Export:
  - `DigitalPassModal` component rendering an institutional admission pass with event details, student credentials, and a high-resolution QR matrix.
  - Native offline "Download Pass (PNG)" feature utilizing HTML5 canvas to export a composite digital ticket image directly to the student's device.
  - Direct "Print Pass" integration triggering optimized print previews.
  - Integrated into both `StudentDashboardPage` ("View Digital Pass" button on confirmed registrations) and `EventDetailsPage`.

### Module 7: QR-Based Attendance Management (Completed)
- Attendance Mongoose Data Model:
  - Schema with references to `registration`, `student`, `event`, and `markedBy` (Admin ID).
  - Enforces single check-in per registration via a database-level unique index (`registration: 1, unique: true`).
  - Audits check-in method (`QR_SCAN` vs `MANUAL`) and logs accurate timestamps.
- Precise Attendance Window Enforcement:
  - Identical validation pipeline for both camera QR scans and manual registration code entries.
  - Check-in window opens strictly at the event's scheduled start time (`date` + `startTime`) and closes at the token's `exp` timestamp.
  - Rejects premature check-ins, expired attendance windows, and cancelled events with clear HTTP `400 Bad Request` diagnostics.
- Cryptographic Token Verification & State Integrity:
  - Verifies QR token signatures using constant-time comparison (`crypto.timingSafeEqual`) and checks expiration.
  - Independently queries MongoDB to confirm registration status is `Confirmed` and registration code matches token payload.
  - Cross-event boundary check: prevents passes issued for Event A from checking into Event B.
- Concurrency & Race-Condition Duplicate Protection:
  - Traps MongoDB duplicate key errors (`E11000`) and returns HTTP `409 Conflict` instead of internal server errors.
- Manual Fallback Entry:
  - Normalizes registration codes to uppercase and enforces format validation (`REG-YYYY-XXXX-XXXX`).
  - Follows identical event publication, attendance window, and registration status validations as QR scans.
- Attendance Analytics & CSV Export:
  - Accurately counts confirmed registrations, checked-in attendees, absent participants, and turnout rate, handling zero-registration edge cases safely.
  - Streams standard RFC 4180 CSV with formula injection defense (sanitizing user-controlled values starting with `=`, `+`, `-`, or `@`).
- Admin Attendance Interface (`/admin/attendance`):
  - Built with `html5-qrcode` supporting real-time camera scanning with debounced scan locks, camera switching, and permission error handling.
  - Manual registration code check-in form.
  - Real-time attendee verification feedback banner displaying student name, department, year, registration code, and check-in time.
  - Live attendee table with search filtering and direct CSV export button.
  - Shortcut "Attendance" button on event rows in `AdminEventsPage` and role-aware navigation bar link.

### Module 8: Certificate Generation and Download (Completed)
- Mongoose `Certificate` Data Model:
  - Schema with references to `event`, `student`, `registration`, `attendance`, and `issuedBy` (Admin ID).
  - Enforces uniqueness via single-field unique indexes on `certificateId`, `registration`, and `attendance`, plus a compound unique index on `{ event: 1, student: 1 }`.
  - Audits issuance timestamps (`issuedAt`) and administrative authority (`issuedBy`).
- Cryptographic Certificate Identifier:
  - High-entropy, unpredictable format: `CERT-YYYY-XXXX-XXXX` generated via Node.js `crypto.randomBytes`.
- Institutional-Grade Landscape A4 PDF Generation (`pdfkit`):
  - Standard landscape A4 dimensions (841.89 x 595.28 points) with navy and gold double-border styling.
  - Dynamically embeds attendee full name, academic department, academic year, event title, date, venue, and organizer.
  - Features high-resolution embedded verification QR matrix pointing to `{CLIENT_URL}/verify-certificate/{certificateId}`.
  - Generates binary PDF Buffers in-memory for zero-disk-dependency downloads and email attachments.
- Strict Eligibility and State Enforcement:
  - Event must be `Published` and concluded (`now >= eventEndDateTime`).
  - Student account must exist with `Student` role.
  - Registration must be in `Confirmed` status.
  - Attendance record must exist with verified `Present` status.
  - Duplicate issuance attempts return HTTP `409 Conflict`.
- Bulk Issuance Pipeline:
  - Processes all verified attendees of a concluded event in a single administrative operation.
  - Skips pre-existing certificates automatically with zero duplicated records or redundant email dispatches.
  - Returns comprehensive execution summaries (`totalConfirmedRegistrations`, `totalVerifiedAttendees`, `certificatesNewlyGenerated`, `certificatesAlreadyExisting`, `emailsQueued`, `failedCount`).
- Dual-Role PDF Download:
  - `GET /api/certificates/:id/download` streams PDF directly with `Content-Type: application/pdf` and `Content-Disposition: attachment`.
  - Restricted to the owning student or authenticated administrators.
- Asynchronous Optional Email Delivery:
  - Delivers formatted HTML credential award email with attached PDF certificate (`EventEase-Certificate-[ID].pdf`).
  - Executed on next event loop tick via `setImmediate` to prevent blocking administrative HTTP responses.
  - Non-blocking error handling: SMTP transport failures never roll back or invalidate issued database certificates.
  - Distinguishes simulated email logging from live SMTP delivery when credentials are unconfigured or placeholders.
- Public Verification System:
  - Public endpoint `GET /api/certificates/verify/:certificateId` accessible without authentication.
  - Public frontend view (`/verify-certificate/:certificateId`) displaying official validity badge, attendee name, event title, date, and issuance date.
  - Privacy preserved: sensitive student email, database IDs, and contact info are strictly omitted.
- Student & Admin UI Interfaces:
  - Student Portal (`/my-certificates`): Personal certificate portfolio with one-click PDF download and public verification links.
  - Admin Certificate Dashboard (`/admin/certificates`): Event selector with concluded status badge, issuance metrics, tabbed issued certificates and pending attendees tables, optional email delivery toggles, and live search filters.
