const mongoose = require('mongoose');

// Generate unique order ID
const generateOrderId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FS-${timestamp}-${random}`;
};

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        default: generateOrderId
    },
    // Customer Information
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerName: String,
    customerPhone: String,
    customerEmail: String,

    // Fuel Details
    fuelType: {
        type: String,
        enum: ['petrol', 'diesel', 'cng'],
        required: true
    },
    liters: {
        type: Number,
        required: true,
        min: 0.1
    },
    pricePerLiter: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },

    // Points
    pointsEarned: {
        type: Number,
        default: 0
    },

    // Fuel Credits Applied
    creditsApplied: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        default: function () { return this.totalAmount - (this.creditsApplied || 0); }
    },

    // Payment Information
    paymentMethod: {
        type: String,
        enum: ['upi', 'card', 'netbanking', 'wallet', 'cash'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'partial_refund'],
        default: 'pending'
    },
    paymentId: String, // Razorpay payment ID or similar
    paymentDetails: {
        gatewayOrderId: String,
        gatewayPaymentId: String,
        gatewaySignature: String,
        paidAt: Date
    },

    // Order Status
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'cancelled', 'expired'],
        default: 'pending'
    },

    // Admin Info
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Timestamps
    completedAt: Date,
    cancelledAt: Date,
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from creation
    },

    // Cancellation
    cancelReason: String,
    refundAmount: Number,
    refundId: String,
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'processed', 'failed'],
        default: 'none'
    },

    // QR Code data (for verification)
    qrCodeData: String,

    // Notes
    notes: String,
    adminNotes: String,

    // Pump/Station Info (for multi-station support)
    stationId: String,
    stationName: String

}, { timestamps: true });

// Index for faster queries
orderSchema.index({ orderId: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup (optional)

// Virtual for checking if order is expired
orderSchema.virtual('isExpired').get(function () {
    return this.expiresAt && new Date() > this.expiresAt && this.status === 'pending';
});

// Pre-save hook to generate QR data
orderSchema.pre('save', function (next) {
    if (!this.qrCodeData) {
        this.qrCodeData = JSON.stringify({
            id: this.orderId,
            fuelType: this.fuelType,
            liters: this.liters,
            totalAmount: this.totalAmount,
            pricePerLiter: this.pricePerLiter,
            pointsEarned: this.pointsEarned,
            customerName: this.customerName,
            customerPhone: this.customerPhone,
            status: this.status,
            paymentMethod: this.paymentMethod,
            createdAt: this.createdAt
        });
    }
    next();
});

// Method to mark order as completed
orderSchema.methods.complete = async function (adminId) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.processedBy = adminId;
    return this.save();
};

// Method to cancel order
orderSchema.methods.cancel = async function (reason, adminId) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelReason = reason;
    this.processedBy = adminId;
    if (this.paymentStatus === 'paid') {
        this.refundStatus = 'pending';
        this.refundAmount = this.totalAmount;
    }
    return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
