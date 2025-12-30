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
app.use('/api/rewards', require('./routes/rewardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/fuel-prices', require('./routes/fuelPriceRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'FuelSync API is running' });
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

  const adminExists = await User.findOne({ email: 'admin@fuelsync.com' });
  if (!adminExists) {
    await User.create({
      name: 'Admin User',
      email: 'admin@fuelsync.com',
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
});