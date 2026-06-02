const express = require('express');
const router = express.Router();

// Import and mount feature routers here
const authRoute = require('./auth.route');

router.use('/api/auth', authRoute);

module.exports = router;
