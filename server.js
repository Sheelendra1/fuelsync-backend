const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
// app.use('/api/rewards', require('./routes/rewardRoutes')); // DEPRECATED: Points now used directly in fuel purchases
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/fuel-prices', require('./routes/fuelPriceRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'FuelMate API is running' });
});

// Seed initial data
const seedInitialData = async () => {
  const FuelPrice = require('./models/FuelPrice');
  const User = require('./models/User');

  const fuelPrices = await FuelPrice.find();
  if (fuelPrices.length === 0) {
    await FuelPrice.insertMany([
      { fuelType: 'petrol', pricePerLiter: 100 },
      { fuelType: 'diesel', pricePerLiter: 85 },
      { fuelType: 'cng', pricePerLiter: 70 }
    ]);
    console.log('Initial fuel prices seeded');
  }

  const adminExists = await User.findOne({ email: 'admin@fuelmate.com' });
  if (!adminExists) {
    await User.create({
      name: 'Admin User',
      email: 'admin@fuelmate.com',
      phone: '9999999999',
      password: 'admin123',
      role: 'admin'
    });
    console.log('Default admin user created');
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  seedInitialData();

  // Keep-alive: Ping server every 10 minutes to prevent Render cold start
  const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
  const SERVER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

  setInterval(async () => {
    try {
      const https = require('https');
      const http = require('http');
      const url = new URL(SERVER_URL);
      const client = url.protocol === 'https:' ? https : http;

      client.get(SERVER_URL, (res) => {
        console.log(`[Keep-Alive] Ping successful - Status: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log(`[Keep-Alive] Ping failed: ${err.message}`);
      });
    } catch (err) {
      console.log(`[Keep-Alive] Error: ${err.message}`);
    }
  }, PING_INTERVAL);

  console.log(`[Keep-Alive] Server will ping itself every 10 minutes to stay awake`);
});