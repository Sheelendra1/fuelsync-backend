const User = require('../models/User');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

const generateReferralCode = () => {
  return 'FUEL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, vehicleNumber, referralCode } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const newReferralCode = generateReferralCode();
    let referredBy = null;

    // Process Referral
    if (referralCode) {
      console.log('Processing referral code:', referralCode);
      const normalizedCode = referralCode.toUpperCase();
      const referrer = await User.findOne({ referralCode: normalizedCode });

      if (referrer) {
        console.log('Referrer found:', referrer.name);
        referredBy = referrer._id;
        // Award Points to Referrer
        referrer.totalPoints = (referrer.totalPoints || 0) + 500;
        referrer.availablePoints = (referrer.availablePoints || 0) + 500;
        await referrer.save();
        console.log('Referrer points updated');

        // Create Transaction Record
        try {
          await Transaction.create({
            customer: referrer._id,
            type: 'referral',
            pointsEarned: 500,
            description: `Referral Bonus: ${name}`,
            referredUser: null, // Will update this after creating the user, or just use name in description as placeholder. Actually can't put user._id yet.
            paymentMethod: 'system',
            status: 'completed'
          });
        } catch (txError) {
          console.error('Error creating referral transaction:', txError);
        }
      } else {
        console.log('Invalid referral code provided');
      }
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      vehicleNumber,
      referralCode: newReferralCode,
      referredBy
    });

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      totalPoints: user.totalPoints,
      availablePoints: user.availablePoints,
      referralCode: user.referralCode,
      token
    });
  } catch (error) {
    console.error(error); // Log the error for debugging
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // Ensure Referral Code Exists (Migration for legacy users)
      if (!user.referralCode) {
        user.referralCode = generateReferralCode();
        await user.save();
      }

      const token = generateToken(user._id);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        totalPoints: user.totalPoints,
        availablePoints: user.availablePoints,
        redeemedPoints: user.redeemedPoints,
        referralCode: user.referralCode,
        token
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    // Ensure Referral Code in Profile fetch too
    if (user && !user.referralCode) {
      user.referralCode = generateReferralCode();
      await user.save();
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.vehicleNumber = req.body.vehicleNumber || user.vehicleNumber;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        totalPoints: updatedUser.totalPoints,
        availablePoints: updatedUser.availablePoints,
        referralCode: updatedUser.referralCode
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};