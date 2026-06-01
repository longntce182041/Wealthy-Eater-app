require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  try {
    const docs = await db.collection('users').find({}).limit(10).toArray();
    console.log('Sample users (up to 10):');
    docs.forEach((d, i) => {
      console.log('\n--- doc', i, '---');
      console.log(JSON.stringify(d, Object.keys(d), 2));
      console.log('fields:', Object.keys(d).join(', '));
    });
    if (docs.length === 0) console.log('No documents in users collection');
  } catch (err) {
    console.error('Error reading users collection:', err.message);
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
