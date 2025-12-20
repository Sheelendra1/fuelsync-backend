const Notification = require('../models/Notification');
const User = require('../models/User');

// Get notifications for logged in user
exports.getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all notifications (admin)
exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Check if notification belongs to user
        if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        notification.read = true;
        await notification.save();

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { read: true }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await notification.deleteOne();

        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create notification (internal helper - also used by other controllers)
exports.createNotification = async (userId, title, message, type = 'system', data = null) => {
    try {
        const notification = await Notification.create({
            user: userId,
            title,
            message,
            type,
            data
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

// Send notification to user (admin only)
exports.sendNotification = async (req, res) => {
    try {
        const { userId, title, message, type } = req.body;

        if (!userId || !title || !message) {
            return res.status(400).json({ message: 'userId, title and message are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const notification = await Notification.create({
            user: userId,
            title,
            message,
            type: type || 'system'
        });

        res.status(201).json({ success: true, notification });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Send notification to all users (admin only)
exports.broadcastNotification = async (req, res) => {
    try {
        const { title, message, type } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: 'title and message are required' });
        }

        const users = await User.find({ role: 'customer' });

        const notifications = await Promise.all(
            users.map(user =>
                Notification.create({
                    user: user._id,
                    title,
                    message,
                    type: type || 'promo'
                })
            )
        );

        res.status(201).json({
            success: true,
            message: `Notification sent to ${notifications.length} users`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            user: req.user.id,
            read: false
        });

        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
