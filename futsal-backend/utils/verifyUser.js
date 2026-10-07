require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2] || 'limbusajan087@gmail.com';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate(
      { email },
      { isEmailVerified: true, emailVerificationToken: undefined, emailVerificationExpires: undefined },
      { new: true }
    );
    if (!user) {
      console.log(`User with email "${email}" not found in database.`);
    } else {
      console.log(`Successfully verified account for: ${user.email} (Role: ${user.role}, isEmailVerified: ${user.isEmailVerified})`);
    }
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to verify user:', err.message);
    process.exit(1);
  }
};

run();
