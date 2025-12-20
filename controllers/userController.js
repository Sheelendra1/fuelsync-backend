const User = require('../models/User');

exports.getCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select('-password');
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    
    if (customer) {
      customer.name = req.body.name || customer.name;
      customer.email = req.body.email || customer.email;
      customer.phone = req.body.phone || customer.phone;
      customer.vehicleNumber = req.body.vehicleNumber || customer.vehicleNumber;
      customer.isActive = req.body.isActive !== undefined ? req.body.isActive : customer.isActive;
      
      const updatedCustomer = await customer.save();
      
      res.json({
        _id: updatedCustomer._id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        vehicleNumber: updatedCustomer.vehicleNumber,
        totalPoints: updatedCustomer.totalPoints,
        availablePoints: updatedCustomer.availablePoints,
        isActive: updatedCustomer.isActive
      });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    
    if (customer) {
      await customer.deleteOne();
      res.json({ message: 'Customer removed' });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTopCustomers = async (req, res) => {
  try {
    const topCustomers = await User.find({ role: 'customer' })
      .select('name email phone totalPoints availablePoints')
      .sort({ totalPoints: -1 })
      .limit(10);
    res.json(topCustomers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};