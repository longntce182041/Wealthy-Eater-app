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
  const cols = await db.listCollections().toArray();
  console.log('Collections found:', cols.map(c => c.name).join(', '));

  const email = process.argv[2] || 'admin@gmail.com';
  for (const c of cols) {
    try {
      const doc = await db.collection(c.name).findOne({ email });
      if (doc) {
        console.log('\n=== Found in collection:', c.name, '===');
        console.log(JSON.stringify(doc, null, 2));
        await mongoose.disconnect();
        process.exit(0);
      }
    } catch (err) {
      console.error('Error querying collection', c.name, err.message);
    }
  }

  console.log('Not found in any collection for email', email);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
