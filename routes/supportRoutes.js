const express = require('express');
const router = express.Router();
const {
    createTicket,
    getMyTickets,
    getAllTickets,
    getTicket,
    replyToTicket,
    updateTicketStatus
} = require('../controllers/supportController');
const { protect, admin } = require('../middleware/auth');

// Customer routes
router.post('/', protect, createTicket);
router.get('/my', protect, getMyTickets);
router.get('/:id', protect, getTicket);
router.post('/:id/reply', protect, replyToTicket);

// Admin routes
router.get('/', protect, admin, getAllTickets);
router.put('/:id/status', protect, admin, updateTicketStatus);

module.exports = router;
