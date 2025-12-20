const express = require('express');
const router = express.Router();
const {
    getMyNotifications,
    getAllNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendNotification,
    broadcastNotification,
    getUnreadCount
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/auth');

// User routes
router.get('/my', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);

// Admin routes
router.get('/', protect, admin, getAllNotifications);
router.post('/send', protect, admin, sendNotification);
router.post('/broadcast', protect, admin, broadcastNotification);

module.exports = router;
