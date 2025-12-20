const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['transaction', 'redemption', 'referral', 'system', 'promo'],
        default: 'system'
    },
    read: {
        type: Boolean,
        default: false
    },
    data: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
