const mongoose = require('mongoose');

const rewardRedemptionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pointsUsed: { type: Number, required: true },
  cashbackAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'applied', 'expired'], 
    default: 'pending' 
  },
  redemptionType: { 
    type: String, 
    enum: ['cashback', 'discount', 'fuel-credit'], 
    default: 'fuel-credit' 
  },
  appliedInTransaction: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Transaction' 
  },
  appliedAt: { type: Date },
  expiryDate: { 
    type: Date, 
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  notes: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

rewardRedemptionSchema.index({ customer: 1, status: 1 });
rewardRedemptionSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('RewardRedemption', rewardRedemptionSchema);