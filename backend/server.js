const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const healthRoutes = require('./src/routes/healthRoutes');
const authRoutes = require('./src/routes/authRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const registrationRoutes = require('./src/routes/registrationRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const certificateRoutes = require('./src/routes/certificateRoutes');
const { Event } = require('./src/models/Event');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (e.g. Render, Cloudflare) for accurate client IP resolution in rate limiting
app.set('trust proxy', 1);

// Connect to database (if configured)
connectDB();

// CORS Configuration
const isProduction = process.env.NODE_ENV === 'production';
const configuredClientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.trim().replace(/\/+$/, '') : null;

// Allow production requests strictly from CLIENT_URL; in development, allow local Vite frontend(s)
const allowedOrigins = isProduction
  ? (configuredClientUrl ? [configuredClientUrl] : [])
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      ...(configuredClientUrl ? [configuredClientUrl] : [])
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without Origin header (e.g. mobile apps, curl, server-to-server, health checks)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
};

// Core Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/certificates', certificateRoutes);

// Initialize registeredCount for legacy events if missing
const initializeLegacyEventCounts = async () => {
  try {
    const result = await Event.updateMany(
      { registeredCount: { $exists: false } },
      { $set: { registeredCount: 0 } }
    );
    if (result.matchedCount > 0) {
      console.log(`[Database] Initialized registeredCount for ${result.modifiedCount} legacy events`);
    }
  } catch (err) {
    console.error('[Database Error] Failed to initialize legacy event registeredCount:', err.message);
  }
};
initializeLegacyEventCounts();

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'EventEase API',
    status: 'online',
    healthCheck: '/api/health',
    authEndpoints: '/api/auth',
    eventsEndpoints: '/api/events',
    registrationEndpoints: '/api/registrations',
    attendanceEndpoints: '/api/attendance',
    certificateEndpoints: '/api/certificates'
  });
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`[EventEase Server] Backend running on port ${PORT}`);
  console.log(`[EventEase Server] Health check endpoint: http://localhost:${PORT}/api/health`);
  console.log(`[EventEase Server] Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`[EventEase Server] Event endpoints: http://localhost:${PORT}/api/events`);
  console.log(`[EventEase Server] Registration endpoints: http://localhost:${PORT}/api/registrations`);
  console.log(`[EventEase Server] Attendance endpoints: http://localhost:${PORT}/api/attendance`);
  console.log(`[EventEase Server] Certificate endpoints: http://localhost:${PORT}/api/certificates`);
});

module.exports = app;
