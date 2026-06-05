const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    const options = {
      autoIndex: true, // Automatically build indexes for validation rules
      connectTimeoutMS: 10000, // Timeout after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log("✔ MongoDB connection cluster successfully established.");
  } catch (error) {
    console.error("❌ Database connection failure sequence:");
console.error(error);
    process.exit(1); // Abort execution with failure flag
  }
};

module.exports = connectDatabase;
