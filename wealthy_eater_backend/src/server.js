const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// CORS - allow development origins and preflight
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (curl, mobile native, or same-origin server requests)
    if (!origin) return callback(null, true);

    // allow any localhost or 127.0.0.1 origin (different dev ports) in development
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }

    // allow emulator host used by Android emulator
    if (origin === 'http://10.0.2.2:5000') return callback(null, true);

    // allow explicit origins set via CORS_ORIGIN env (comma separated)
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.indexOf('*') !== -1) {
      return callback(null, true);
    }

    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true
}));

// mount application routes
const routes = require('./routes');
app.use(routes);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Wealthy Eater API is running',
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error);
  });