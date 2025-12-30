const Order = require('../models/Order');
const crypto = require('crypto');

// Note: In production, uncomment and configure Razorpay
// const Razorpay = require('razorpay');
// const razorpay = new Razorpay({
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// Generate unique order ID
const generateOrderId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FS-${timestamp}-${random}`;
};

// @desc    Create Razorpay order for payment
// @route   POST /api/payments/create-order
// @access  Private (Customer)
const createPaymentOrder = async (req, res) => {
    try {
        const { amount, fuelType, liters, pricePerLiter, currency = 'INR' } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        // In production with Razorpay:
        // const razorpayOrder = await razorpay.orders.create({
        //     amount: Math.round(amount * 100), // Razorpay accepts amount in paise
        //     currency,
        //     receipt: generateOrderId(),
        //     notes: {
        //         fuelType,
        //         liters,
        //         pricePerLiter
        //     }
        // });

        // For now, simulate Razorpay order creation
        const simulatedOrder = {
            id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            entity: 'order',
            amount: Math.round(amount * 100),
            amount_paid: 0,
            amount_due: Math.round(amount * 100),
            currency,
            receipt: generateOrderId(),
            status: 'created',
            notes: {
                fuelType,
                liters,
                pricePerLiter
            },
            created_at: Date.now()
        };

        res.json({
            success: true,
            order: simulatedOrder,
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxx', // Razorpay key for frontend
            message: 'Payment order created (simulated mode)'
        });
    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
// @access  Private (Customer)
const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderDetails // { fuelType, liters, totalAmount, paymentMethod }
        } = req.body;

        // In production with Razorpay:
        // const body = razorpay_order_id + '|' + razorpay_payment_id;
        // const expectedSignature = crypto
        //     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        //     .update(body.toString())
        //     .digest('hex');
        // 
        // if (expectedSignature !== razorpay_signature) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Payment verification failed'
        //     });
        // }

        // For simulation, always verify as successful
        const isVerified = true; // In production, use actual verification

        if (!isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Create the fuel order after successful payment
        const User = require('../models/User');
        const FuelPrice = require('../models/FuelPrice');

        const customer = await User.findById(req.user._id);
        const fuelPrice = await FuelPrice.findOne({ fuelType: orderDetails.fuelType });

        const pointsEarned = Math.floor(orderDetails.totalAmount / 10);

        const order = new Order({
            orderId: generateOrderId(),
            customerId: customer._id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            fuelType: orderDetails.fuelType,
            liters: orderDetails.liters,
            pricePerLiter: fuelPrice?.pricePerLiter || orderDetails.pricePerLiter,
            totalAmount: orderDetails.totalAmount,
            pointsEarned,
            paymentMethod: orderDetails.paymentMethod || 'upi',
            paymentStatus: 'paid',
            paymentId: razorpay_payment_id || `SIM_${Date.now()}`,
            paymentDetails: {
                gatewayOrderId: razorpay_order_id,
                gatewayPaymentId: razorpay_payment_id,
                gatewaySignature: razorpay_signature,
                paidAt: new Date()
            },
            status: 'pending',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        await order.save();

        res.json({
            success: true,
            message: 'Payment verified and order created',
            order: {
                orderId: order.orderId,
                fuelType: order.fuelType,
                liters: order.liters,
                pricePerLiter: order.pricePerLiter,
                totalAmount: order.totalAmount,
                pointsEarned: order.pointsEarned,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                status: order.status,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                qrCodeData: order.qrCodeData,
                createdAt: order.createdAt,
                expiresAt: order.expiresAt
            }
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};

// @desc    Process refund for cancelled order
// @route   POST /api/payments/refund
// @access  Private (Admin)
const processRefund = async (req, res) => {
    try {
        const { orderId, amount, reason } = req.body;

        let order = await Order.findOne({ orderId });
        if (!order) {
            order = await Order.findById(orderId);
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded') {
            return res.status(400).json({
                success: false,
                message: 'Order payment status does not allow refund'
            });
        }

        if (order.refundStatus === 'processed') {
            return res.status(400).json({
                success: false,
                message: 'Refund already processed'
            });
        }

        // In production with Razorpay:
        // const refund = await razorpay.payments.refund(order.paymentId, {
        //     amount: Math.round(amount * 100), // in paise
        //     speed: 'optimum',
        //     notes: { reason }
        // });

        // Simulate refund
        const refundAmount = amount || order.totalAmount;
        order.refundStatus = 'processed';
        order.refundAmount = refundAmount;
        order.refundId = `rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        order.paymentStatus = refundAmount === order.totalAmount ? 'refunded' : 'partial_refund';

        await order.save();

        res.json({
            success: true,
            message: 'Refund processed successfully (simulated)',
            refund: {
                orderId: order.orderId,
                refundId: order.refundId,
                refundAmount: order.refundAmount,
                refundStatus: order.refundStatus,
                paymentStatus: order.paymentStatus
            }
        });
    } catch (error) {
        console.error('Process refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process refund',
            error: error.message
        });
    }
};

// @desc    Get payment status for an order
// @route   GET /api/payments/status/:orderId
// @access  Private
const getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        let order = await Order.findOne({ orderId });
        if (!order) {
            order = await Order.findById(orderId);
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization
        if (req.user.role === 'customer' && order.customerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        res.json({
            success: true,
            payment: {
                orderId: order.orderId,
                paymentId: order.paymentId,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                totalAmount: order.totalAmount,
                refundStatus: order.refundStatus,
                refundAmount: order.refundAmount,
                paidAt: order.paymentDetails?.paidAt
            }
        });
    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment status',
            error: error.message
        });
    }
};

// @desc    Webhook for Razorpay payment events
// @route   POST /api/payments/webhook
// @access  Public (but verified by signature)
const handleWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'];

        // In production:
        // const body = JSON.stringify(req.body);
        // const expectedSignature = crypto
        //     .createHmac('sha256', webhookSecret)
        //     .update(body)
        //     .digest('hex');
        // 
        // if (expectedSignature !== signature) {
        //     return res.status(400).json({ message: 'Invalid signature' });
        // }

        const event = req.body.event;
        const payload = req.body.payload;

        switch (event) {
            case 'payment.captured':
                // Payment successful
                console.log('Payment captured:', payload.payment.entity.id);
                break;
            case 'payment.failed':
                // Payment failed
                console.log('Payment failed:', payload.payment.entity.id);
                break;
            case 'refund.processed':
                // Refund processed
                console.log('Refund processed:', payload.refund.entity.id);
                break;
            default:
                console.log('Unhandled webhook event:', event);
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ message: 'Webhook processing failed' });
    }
};

module.exports = {
    createPaymentOrder,
    verifyPayment,
    processRefund,
    getPaymentStatus,
    handleWebhook
};
