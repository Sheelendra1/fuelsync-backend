const Order = require('../models/Order');
const User = require('../models/User');
const FuelPrice = require('../models/FuelPrice');

// Generate unique order ID
const generateOrderId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FS-${timestamp}-${random}`;
};

// @desc    Create a new prepaid order
// @route   POST /api/orders
// @access  Private (Customer)
const createOrder = async (req, res) => {
    try {
        const {
            fuelType,
            liters,
            totalAmount,
            creditsApplied = 0,
            finalAmount,
            paymentMethod,
            paymentId,
            paymentDetails
        } = req.body;

        // Validate required fields
        if (!fuelType || !liters || !totalAmount || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: fuelType, liters, totalAmount, paymentMethod'
            });
        }

        // Get current fuel price
        const fuelPrice = await FuelPrice.findOne({ fuelType });
        if (!fuelPrice) {
            return res.status(400).json({
                success: false,
                message: 'Invalid fuel type'
            });
        }

        // Get customer details
        const customer = await User.findById(req.user._id);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Validate credits if applying
        let actualCreditsApplied = 0;
        if (creditsApplied > 0) {
            // Check if customer has enough credits
            if ((customer.availablePoints || 0) < creditsApplied) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient credits. Available: ₹${customer.availablePoints || 0}`
                });
            }
            // Credits must be at least ₹10 to apply
            if (creditsApplied < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Minimum ₹10 credits required to apply'
                });
            }
            actualCreditsApplied = Math.min(creditsApplied, totalAmount);
        }

        // Calculate final amount after credits
        const actualFinalAmount = finalAmount || (totalAmount - actualCreditsApplied);

        // Calculate points: 1 point per ₹50 spent on actual payment (not credits)
        // 1 point = 1 rupee fuel credit
        const pointsEarned = parseFloat((actualFinalAmount / 50).toFixed(2));

        // Create order
        const order = new Order({
            orderId: generateOrderId(),
            customerId: customer._id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            fuelType,
            liters,
            pricePerLiter: fuelPrice.pricePerLiter,
            totalAmount,
            creditsApplied: actualCreditsApplied,
            finalAmount: actualFinalAmount,
            pointsEarned,
            paymentMethod,
            paymentStatus: paymentId ? 'paid' : 'pending',
            paymentId,
            paymentDetails: paymentDetails || {},
            status: 'pending',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        await order.save();

        // Deduct credits from customer if applied
        if (actualCreditsApplied > 0) {
            customer.availablePoints = (customer.availablePoints || 0) - actualCreditsApplied;
            await customer.save();
        }

        res.status(201).json({
            success: true,
            message: actualCreditsApplied > 0
                ? `Order created with ₹${actualCreditsApplied} credits applied`
                : 'Order created successfully',
            order: {
                orderId: order.orderId,
                fuelType: order.fuelType,
                liters: order.liters,
                pricePerLiter: order.pricePerLiter,
                totalAmount: order.totalAmount,
                creditsApplied: order.creditsApplied,
                finalAmount: order.finalAmount,
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
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

// @desc    Get all orders for current customer
// @route   GET /api/orders/my-orders
// @access  Private (Customer)
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.user._id })
            .sort({ createdAt: -1 })
            .select('-__v');

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:orderId
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Try to find by orderId first, then by MongoDB _id
        let order = await Order.findOne({ orderId })
            .populate('customerId', 'name email phone')
            .populate('processedBy', 'name');

        if (!order) {
            order = await Order.findById(orderId)
                .populate('customerId', 'name email phone')
                .populate('processedBy', 'name');
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization - customer can only view their own orders
        if (req.user.role === 'customer' && order.customerId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error.message
        });
    }
};

// @desc    Get all pending orders (Admin)
// @route   GET /api/orders/pending
// @access  Private (Admin)
const getPendingOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            status: 'pending',
            paymentStatus: 'paid'
        })
            .populate('customerId', 'name email phone')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('Get pending orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending orders',
            error: error.message
        });
    }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
    try {
        const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

        let query = {};

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const orders = await Order.find(query)
            .populate('customerId', 'name email phone')
            .populate('processedBy', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            count: orders.length,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            orders
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// @desc    Complete an order (Admin)
// @route   PUT /api/orders/:orderId/complete
// @access  Private (Admin)
const completeOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { notes } = req.body;

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

        if (order.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Order is already completed'
            });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot complete a cancelled order'
            });
        }

        // Update order status
        order.status = 'completed';
        order.completedAt = new Date();
        order.processedBy = req.user._id;
        if (notes) order.adminNotes = notes;

        await order.save();

        // Add points to customer account
        const customer = await User.findById(order.customerId);
        if (customer) {
            customer.totalPoints = (customer.totalPoints || 0) + order.pointsEarned;
            customer.availablePoints = (customer.availablePoints || 0) + order.pointsEarned;
            await customer.save();
        }

        res.json({
            success: true,
            message: 'Order completed successfully',
            order: {
                orderId: order.orderId,
                status: order.status,
                completedAt: order.completedAt,
                pointsAwarded: order.pointsEarned
            }
        });
    } catch (error) {
        console.error('Complete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete order',
            error: error.message
        });
    }
};

// @desc    Cancel an order and process refund (Admin)
// @route   PUT /api/orders/:orderId/cancel
// @access  Private (Admin)
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason, refundType = 'full' } = req.body;

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

        if (order.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a completed order'
            });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is already cancelled'
            });
        }

        // Update order status
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelReason = reason || 'Cancelled by admin';
        order.processedBy = req.user._id;

        // Process refund if payment was made
        if (order.paymentStatus === 'paid') {
            order.refundStatus = 'pending';
            order.refundAmount = refundType === 'full' ? order.totalAmount : 0;
            // In production, this would trigger actual refund via payment gateway
            order.refundStatus = 'processed'; // Simulated
            order.paymentStatus = 'refunded';
        }

        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            order: {
                orderId: order.orderId,
                status: order.status,
                cancelledAt: order.cancelledAt,
                cancelReason: order.cancelReason,
                refundAmount: order.refundAmount,
                refundStatus: order.refundStatus
            }
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
};

// @desc    Verify order by QR code data or order ID
// @route   POST /api/orders/verify
// @access  Private (Admin)
const verifyOrder = async (req, res) => {
    try {
        const { orderId, qrData } = req.body;

        let order;

        // If QR data is provided, parse it
        if (qrData) {
            try {
                const parsed = JSON.parse(qrData);
                order = await Order.findOne({ orderId: parsed.id })
                    .populate('customerId', 'name email phone');
            } catch (e) {
                // QR data might just be the order ID string
                order = await Order.findOne({ orderId: qrData })
                    .populate('customerId', 'name email phone');
            }
        } else if (orderId) {
            order = await Order.findOne({ orderId })
                .populate('customerId', 'name email phone');
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
                valid: false
            });
        }

        // Check if order is expired
        if (order.expiresAt && new Date() > order.expiresAt && order.status === 'pending') {
            order.status = 'expired';
            await order.save();
        }

        const isValid = order.status === 'pending' && order.paymentStatus === 'paid';

        res.json({
            success: true,
            valid: isValid,
            message: isValid ? 'Order is valid and ready to be fulfilled' : `Order is ${order.status}`,
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
                createdAt: order.createdAt,
                expiresAt: order.expiresAt
            }
        });
    } catch (error) {
        console.error('Verify order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify order',
            error: error.message
        });
    }
};

// @desc    Simulate payment (for testing without real payment gateway)
// @route   POST /api/orders/:orderId/simulate-payment
// @access  Private
const simulatePayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { success = true } = req.body;

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

        if (success) {
            order.paymentStatus = 'paid';
            order.paymentId = `SIM_${Date.now()}`;
            order.paymentDetails = {
                gatewayOrderId: `SIM_ORDER_${Date.now()}`,
                gatewayPaymentId: `SIM_PAY_${Date.now()}`,
                gatewaySignature: 'simulated',
                paidAt: new Date()
            };
        } else {
            order.paymentStatus = 'failed';
        }

        await order.save();

        res.json({
            success: true,
            message: success ? 'Payment simulated successfully' : 'Payment failed (simulated)',
            order: {
                orderId: order.orderId,
                paymentStatus: order.paymentStatus,
                paymentId: order.paymentId
            }
        });
    } catch (error) {
        console.error('Simulate payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to simulate payment',
            error: error.message
        });
    }
};

// @desc    Get order statistics (Admin Dashboard)
// @route   GET /api/orders/stats
// @access  Private (Admin)
const getOrderStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalOrders,
            pendingOrders,
            completedOrders,
            cancelledOrders,
            todayOrders,
            totalRevenue
        ] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'completed' }),
            Order.countDocuments({ status: 'cancelled' }),
            Order.countDocuments({ createdAt: { $gte: today } }),
            Order.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ])
        ]);

        // Fuel type breakdown
        const fuelTypeStats = await Order.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: '$fuelType',
                    count: { $sum: 1 },
                    totalLiters: { $sum: '$liters' },
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);

        res.json({
            success: true,
            stats: {
                totalOrders,
                pendingOrders,
                completedOrders,
                cancelledOrders,
                todayOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                fuelTypeBreakdown: fuelTypeStats
            }
        });
    } catch (error) {
        console.error('Get order stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order statistics',
            error: error.message
        });
    }
};

module.exports = {
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
};
