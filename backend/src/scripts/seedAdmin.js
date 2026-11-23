const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

/**
 * Standalone seed script to provision the initial Administrator account.
 * Mandates ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD environment variables.
 */
const seedAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } = process.env;

  // Validation Check: Mandatory environment variables
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'Error: ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD environment variables are required.'
    );
    process.exit(1);
  }

  // Validation Check: Enforce minimum password length of 8 characters
  if (ADMIN_PASSWORD.length < 8) {
    console.error(
      'Error: ADMIN_PASSWORD must be at least 8 characters long.'
    );
    process.exit(1);
  }

  if (!MONGODB_URI || MONGODB_URI === 'your_mongodb_connection_string') {
    console.error('Error: MONGODB_URI is not configured in backend/.env');
    process.exit(1);
  }

  try {
    console.log('[Seed Admin] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed Admin] Connected to MongoDB successfully.');

    // Normalize admin email
    const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();

    // Check if an account with this email already exists
    const existingAdmin = await User.findOne({ email: normalizedEmail });

    if (existingAdmin) {
      console.log(
        `[Seed Admin] Admin account with email "${normalizedEmail}" already exists. (Role: ${existingAdmin.role})`
      );
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create the initial Admin account
    const adminUser = await User.create({
      name: ADMIN_NAME.trim(),
      email: normalizedEmail,
      password: ADMIN_PASSWORD,
      department: 'Administration',
      year: 'Faculty/Staff',
      role: 'Admin'
    });

    console.log(
      `[Seed Admin] Initial Admin account created successfully!`
    );
    console.log(`[Seed Admin] ID: ${adminUser._id}`);
    console.log(`[Seed Admin] Name: ${adminUser.name}`);
    console.log(`[Seed Admin] Email: ${adminUser.email}`);
    console.log(`[Seed Admin] Role: ${adminUser.role}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Admin Error]', error.message);
    process.exit(1);
  }
};

seedAdmin();

