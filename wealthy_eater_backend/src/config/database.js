const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('MONGODB_URI is not set. Check wealthy_eater_backend/.env for a valid dotenv entry.');
    }

    const options = {
      autoIndex: true, // Automatically build indexes for validation rules
      connectTimeoutMS: 10000, // Timeout after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds
    };

    await mongoose.connect(uri, options);
    console.log("✔ MongoDB connection cluster successfully established.");
  } catch (error) {
    if (error?.message?.includes('querySrv') || error?.message?.includes('mongodb+srv')) {
      console.error('❌ MongoDB SRV lookup failed. Check the Atlas hostname, DNS/network access, and whether the cluster allows your current IP.');
    }

    console.error("❌ Database connection failure sequence:", error.message);
    process.exit(1); // Abort execution with failure flag
  }
};

module.exports = connectDatabase;
