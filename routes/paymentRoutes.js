const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
    createPaymentOrder,
    verifyPayment,
    processRefund,
    getPaymentStatus,
    handleWebhook
} = require('../controllers/paymentController');

// Customer routes
router.post('/create-order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPayment);
router.get('/status/:orderId', protect, getPaymentStatus);

// Admin routes
router.post('/refund', protect, admin, processRefund);

// Webhook (public but verified by signature)
router.post('/webhook', handleWebhook);

module.exports = router;
