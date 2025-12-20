const Transaction = require('../models/Transaction');
const User = require('../models/User');
const FuelPrice = require('../models/FuelPrice');
const { createNotification } = require('./notificationController');

// Get customers for transaction dropdown
exports.getCustomersForTransaction = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer', isActive: true })
      .select('name email phone vehicleNumber availablePoints')
      .sort({ name: 1 });

    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new transaction
exports.createTransaction = async (req, res) => {
  try {
    const {
      customerId,
      fuelType,
      liters,
      paymentMethod,
      pumpOperator,
      notes,
      isDoublePoints,
      redemptionId
    } = req.body;

    if (!customerId || !fuelType || !liters) {
      return res.status(400).json({
        message: 'Please provide customer, fuel type, and liters'
      });
    }

    const fuelPrice = await FuelPrice.findOne({ fuelType });
    if (!fuelPrice) {
      return res.status(400).json({ message: `Fuel price for ${fuelType} not set` });
    }

    const pricePerLiter = fuelPrice.pricePerLiter;
    const totalAmount = liters * pricePerLiter;

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    let redemptionApplied = false;
    let cashbackAmount = 0;
    let redemptionData = null;

    // Apply redemption if provided
    if (redemptionId) {
      const redemption = await require('../models/RewardRedemption').findOne({
        _id: redemptionId,
        customer: customerId,
        status: 'approved',
        expiryDate: { $gt: new Date() }
      });

      if (redemption) {
        if (redemption.cashbackAmount <= totalAmount) {
          redemptionApplied = true;
          cashbackAmount = redemption.cashbackAmount;
          redemptionData = redemption;

          redemption.status = 'applied';
          redemption.appliedAt = new Date();
          redemption.processedBy = req.user.id;
          await redemption.save();
        } else {
          return res.status(400).json({
            message: `Redemption amount (₹${redemption.cashbackAmount}) exceeds transaction amount (₹${totalAmount})`
          });
        }
      }
    }

    // Create transaction
    const transaction = await Transaction.create({
      customer: customerId,
      fuelType,
      liters,
      pricePerLiter,
      totalAmount,
      redemptionApplied,
      redemptionId: redemptionData ? redemptionData._id : null,
      cashbackAmount,
      paymentMethod: paymentMethod || 'cash',
      pumpOperator: pumpOperator || req.user.name,
      notes,
      isDoublePoints: isDoublePoints || false
    });

    if (redemptionData) {
      redemptionData.appliedInTransaction = transaction._id;
      await redemptionData.save();
    }

    // Update customer's points (earn new points)
    customer.totalPoints += transaction.pointsEarned;
    customer.availablePoints += transaction.pointsEarned;
    await customer.save();

    // Create notification for customer
    await createNotification(
      customerId,
      'Transaction Recorded',
      `You earned ${transaction.pointsEarned} points from your ${fuelType} purchase of ${liters}L (₹${totalAmount})`,
      'transaction',
      { transactionId: transaction._id }
    );

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('customer', 'name email phone');

    res.status(201).json({
      success: true,
      message: redemptionApplied
        ? `Transaction recorded with ₹${cashbackAmount} cashback applied`
        : 'Transaction recorded successfully',
      transaction: populatedTransaction,
      cashbackApplied: cashbackAmount,
      finalAmount: transaction.finalAmount
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get customer transactions
exports.getMyTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ customer: req.user.id })
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer', 'name email phone vehicleNumber');

    if (transaction) {
      res.json(transaction);
    } else {
      res.status(404).json({ message: 'Transaction not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};