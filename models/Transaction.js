const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['fuel', 'referral'], default: 'fuel' },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'cng'],
    required: function () { return this.type === 'fuel'; }
  },
  liters: {
    type: Number,
    required: function () { return this.type === 'fuel'; }
  },
  pricePerLiter: {
    type: Number,
    required: function () { return this.type === 'fuel'; }
  },
  totalAmount: {
    type: Number,
    required: function () { return this.type === 'fuel'; }
  },
  pointsEarned: { type: Number, default: 0 },
  isDoublePoints: { type: Boolean, default: false },
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'system'], default: 'cash' },
  pumpOperator: String,
  receiptNumber: { type: String, unique: true },
  description: String,
  referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Redemption fields
  redemptionApplied: { type: Boolean, default: false },
  redemptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardRedemption' },
  cashbackAmount: { type: Number, default: 0 },
  finalAmount: { type: Number },
  notes: String
}, { timestamps: true });

transactionSchema.pre('save', function (next) {
  if (!this.receiptNumber) {
    const date = new Date();
    const random = Math.floor(1000 + Math.random() * 9000);
    this.receiptNumber = `FS${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${random}`;
  }

  if (this.type === 'fuel') {
    const points = Math.floor(this.totalAmount / 100);
    this.pointsEarned = this.isDoublePoints ? points * 2 : points;

    if (this.redemptionApplied && this.cashbackAmount) {
      this.finalAmount = Math.max(0, this.totalAmount - this.cashbackAmount);
    } else {
      this.finalAmount = this.totalAmount;
    }
  } else {
    // For referral, finalAmount can be 0 or null
    this.finalAmount = 0;
  }

  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);