require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const email = process.argv[2] || 'admin@gmail.com';
  const user = await User.findOne({ email }).lean();
  if (!user) {
    console.log('User not found for email', email);
  } else {
    console.log('User found:');
    console.log(JSON.stringify(user, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
