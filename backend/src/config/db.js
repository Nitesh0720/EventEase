const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas or local MongoDB instance
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri === 'your_mongodb_connection_string') {
    console.log('[Database] MONGODB_URI is using placeholder credentials. Running in standalone mode for Module 1.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // Non-fatal in Module 1 so health check endpoint remains responsive
  }
};

module.exports = connectDB;

