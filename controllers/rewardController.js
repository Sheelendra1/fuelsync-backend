const RewardRedemption = require('../models/RewardRedemption');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// Create redemption request
exports.createRedemption = async (req, res) => {
  try {
    const { pointsUsed, redemptionType, notes } = req.body;

    const customer = await User.findById(req.user.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (pointsUsed > customer.availablePoints) {
      return res.status(400).json({ message: 'Insufficient points' });
    }

    // Minimum points check removed

    const cashbackAmount = pointsUsed;

    const redemption = await RewardRedemption.create({
      customer: req.user.id,
      pointsUsed,
      cashbackAmount,
      redemptionType: redemptionType || 'fuel-credit',
      notes,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Redemption request submitted successfully',
      redemption
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all redemption requests
exports.getRedemptions = async (req, res) => {
  try {
    const { status, customerId } = req.query;

    let filter = {};
    if (status) {
      filter.status = status;
    }
    if (customerId) {
      filter.customer = customerId;
    }

    const redemptions = await RewardRedemption.find(filter)
      .populate('customer', 'name email phone')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(redemptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get my redemption requests
exports.getMyRedemptions = async (req, res) => {
  try {
    const redemptions = await RewardRedemption.find({ customer: req.user.id })
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(redemptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update redemption status
exports.updateRedemptionStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const redemption = await RewardRedemption.findById(req.params.id)
      .populate('customer');

    if (!redemption) {
      return res.status(404).json({ message: 'Redemption not found' });
    }

    const customer = await User.findById(redemption.customer._id);

    if (status === 'approved') {
      if (redemption.pointsUsed > customer.availablePoints) {
        return res.status(400).json({ message: 'Customer has insufficient points' });
      }

      customer.availablePoints -= redemption.pointsUsed;
      customer.redeemedPoints += redemption.pointsUsed;
      await customer.save();

      redemption.status = 'approved';
      redemption.processedBy = req.user.id;
      redemption.notes = notes || redemption.notes;

    } else if (status === 'rejected') {
      redemption.status = 'rejected';
      redemption.processedBy = req.user.id;
      redemption.notes = notes || redemption.notes;
    }

    await redemption.save();

    // Create notification for customer
    if (status === 'approved') {
      await createNotification(
        redemption.customer._id,
        'Redemption Approved! 🎉',
        `Your redemption request for ${redemption.pointsUsed} points (₹${redemption.cashbackAmount} cashback) has been approved!`,
        'redemption',
        { redemptionId: redemption._id }
      );
    } else if (status === 'rejected') {
      await createNotification(
        redemption.customer._id,
        'Redemption Rejected',
        `Your redemption request for ${redemption.pointsUsed} points was rejected. ${notes || ''}`,
        'redemption',
        { redemptionId: redemption._id }
      );
    }

    res.json({
      success: true,
      message: `Redemption ${status} successfully`,
      redemption
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get customer's approved redemptions
exports.getCustomerApprovedRedemptions = async (req, res) => {
  try {
    const { customerId } = req.params;

    const redemptions = await RewardRedemption.find({
      customer: customerId,
      status: 'approved',
      expiryDate: { $gt: new Date() }
    }).sort({ createdAt: 1 });

    res.json(redemptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};