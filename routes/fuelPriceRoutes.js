const express = require('express');
const router = express.Router();
const {
  getFuelPrices,
  updateFuelPrice
} = require('../controllers/fuelPriceController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, getFuelPrices);
router.put('/:id', protect, admin, updateFuelPrice);

module.exports = router;