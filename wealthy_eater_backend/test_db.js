const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      const UserProfile = require('./src/models/UserProfile');
      const profiles = await UserProfile.find().lean();
      console.log('Profiles count:', profiles.length);
      console.log('Profiles:', profiles);
    } catch(e) {
      console.error(e);
    }
    process.exit(0);
  });
