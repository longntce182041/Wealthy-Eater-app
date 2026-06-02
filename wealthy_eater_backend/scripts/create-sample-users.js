require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');

async function upsertUser({ email, password, fullName, role }) {
  const hash = await bcrypt.hash(password, 10);
  const now = new Date();
  const doc = {
    fullName,
    email,
    password: hash,
    role,
    status: 'active',
    isActive: true,
    updatedAt: now,
    createdAt: now
  };

  const res = await User.updateOne({ email }, { $set: doc }, { upsert: true });
  return res;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const users = [
    { email: 'admin@gmail.com', password: 'password123', fullName: 'Admin User', role: 'admin' },
    { email: 'customer@gmail.com', password: 'customer123', fullName: 'Customer User', role: 'customer' },
    { email: 'nutritionist@gmail.com', password: 'nutrit123', fullName: 'Nutritionist User', role: 'nutritionist' }
  ];

  for (const u of users) {
    try {
      const r = await upsertUser(u);
      console.log(`Upserted ${u.email}:`, r.upsertedId ? `created id ${r.upsertedId._id}` : 'updated');
    } catch (err) {
      console.error('Error upserting', u.email, err.message);
    }
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
