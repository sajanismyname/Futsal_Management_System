const mongoose = require('mongoose');

const connectDB = async (customUri) => {
  const uri = customUri || process.env.MONGO_URI || 'mongodb://localhost:27017/futsal_management';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('Retrying MongoDB connection in 5 seconds...');
      setTimeout(() => connectDB(customUri), 5000);
    }
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
