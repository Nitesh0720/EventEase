/**
 * Health check controller
 * Confirms that the EventEase backend service is up and responsive
 */
const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'EventEase backend is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
};

module.exports = {
  getHealthStatus
};

