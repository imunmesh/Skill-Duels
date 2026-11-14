const mongoose = require('mongoose');

/**
 * Connect to MongoDB database using Mongoose
 */
const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillduels';
    
    const conn = await mongoose.connect(connUri, {
      autoIndex: true, // Build indexes automatically in dev
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // Exit process with failure so container/process manager knows
    process.exit(1);
  }
};

module.exports = connectDB;
