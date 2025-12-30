const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
    createOrder,
    getMyOrders,
    getOrderById,
    getPendingOrders,
    getAllOrders,
    completeOrder,
    cancelOrder,
    verifyOrder,
    simulatePayment,
    getOrderStats
} = require('../controllers/orderController');

// Customer routes
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);

// Admin routes
router.get('/pending', protect, admin, getPendingOrders);
router.get('/stats', protect, admin, getOrderStats);
router.get('/', protect, admin, getAllOrders);
router.post('/verify', protect, admin, verifyOrder);
router.put('/:orderId/complete', protect, admin, completeOrder);
router.put('/:orderId/cancel', protect, admin, cancelOrder);

// Shared routes (both customer and admin can access)
router.get('/:orderId', protect, getOrderById);

// Testing/Development routes
router.post('/:orderId/simulate-payment', protect, simulatePayment);

module.exports = router;
