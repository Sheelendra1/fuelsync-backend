const FuelPrice = require('../models/FuelPrice');

exports.getFuelPrices = async (req, res) => {
  try {
    const fuelPrices = await FuelPrice.find().sort({ fuelType: 1 });
    res.json(fuelPrices);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateFuelPrice = async (req, res) => {
  try {
    const { pricePerLiter } = req.body;
    
    const fuelPrice = await FuelPrice.findById(req.params.id);
    
    if (fuelPrice) {
      fuelPrice.pricePerLiter = pricePerLiter;
      fuelPrice.lastUpdated = Date.now();
      
      const updatedFuelPrice = await fuelPrice.save();
      res.json(updatedFuelPrice);
    } else {
      res.status(404).json({ message: 'Fuel price not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};