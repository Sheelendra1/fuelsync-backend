const mongoose = require('mongoose');

const fuelPriceSchema = new mongoose.Schema({
  fuelType: { type: String, enum: ['petrol', 'diesel', 'cng'], required: true, unique: true },
  pricePerLiter: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FuelPrice', fuelPriceSchema);