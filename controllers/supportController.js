const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// Create new support ticket
exports.createTicket = async (req, res) => {
    try {
        const { subject, message, priority } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        const ticket = await SupportTicket.create({
            user: req.user.id,
            subject,
            message,
            priority: priority || 'medium'
        });

        // Notify admins about new ticket
        const admins = await User.find({ role: 'admin' });
        const user = await User.findById(req.user.id);
        for (const admin of admins) {
            await createNotification(
                admin._id,
                'New Support Ticket',
                `${user.name} submitted a support request: "${subject}"`,
                'system',
                { ticketId: ticket._id }
            );
        }

        res.status(201).json({
            success: true,
            message: 'Support ticket submitted successfully',
            ticket
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get my tickets (customer)
exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all tickets (admin)
exports.getAllTickets = async (req, res) => {
    try {
        const { status } = req.query;
        let filter = {};
        if (status) filter.status = status;

        const tickets = await SupportTicket.find(filter)
            .populate('user', 'name email phone')
            .populate('replies.user', 'name')
            .sort({ createdAt: -1 });
        res.json(tickets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single ticket
exports.getTicket = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate('replies.user', 'name');

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check if user owns ticket or is admin
        if (ticket.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(ticket);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reply to ticket
exports.replyToTicket = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const ticket = await SupportTicket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check authorization
        const isAdmin = req.user.role === 'admin';
        const isOwner = ticket.user.toString() === req.user.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        ticket.replies.push({
            message,
            isAdmin,
            user: req.user.id
        });

        // Update status if admin replies
        if (isAdmin && ticket.status === 'open') {
            ticket.status = 'in-progress';
        }

        await ticket.save();

        // Notify the other party
        if (isAdmin) {
            await createNotification(
                ticket.user,
                'Support Reply',
                `Admin replied to your ticket: "${ticket.subject}"`,
                'system',
                { ticketId: ticket._id }
            );
        } else {
            const admins = await User.find({ role: 'admin' });
            for (const admin of admins) {
                await createNotification(
                    admin._id,
                    'Customer Reply',
                    `Customer replied to ticket: "${ticket.subject}"`,
                    'system',
                    { ticketId: ticket._id }
                );
            }
        }

        const updatedTicket = await SupportTicket.findById(req.params.id)
            .populate('user', 'name email')
            .populate('replies.user', 'name');

        res.json({
            success: true,
            message: 'Reply added successfully',
            ticket: updatedTicket
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update ticket status (admin)
exports.updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const ticket = await SupportTicket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        ticket.status = status;
        await ticket.save();

        // Notify customer
        await createNotification(
            ticket.user,
            'Ticket Status Updated',
            `Your support ticket "${ticket.subject}" has been marked as ${status}`,
            'system',
            { ticketId: ticket._id }
        );

        res.json({
            success: true,
            message: `Ticket status updated to ${status}`,
            ticket
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
