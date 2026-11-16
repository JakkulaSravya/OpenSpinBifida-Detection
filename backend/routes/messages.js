const express = require('express');
const { verifyToken } = require('../middleware/auth');
const Message = require('../models/Message');
const router = express.Router();

// ---- IMPORTANT: Specific routes MUST come BEFORE parameterized routes ----

// Get unread count
router.get('/unread/count', verifyToken, async (req, res) => {
    try {
        const count = await Message.countDocuments({ receiverId: req.user.id, read: false });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get conversations list
router.get('/conversations/list', verifyToken, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
        }).sort({ createdAt: -1 });

        const conversationMap = {};
        messages.forEach(msg => {
            const otherId = msg.senderId.toString() === req.user.id
                ? msg.receiverId.toString()
                : msg.senderId.toString();
            if (!conversationMap[otherId]) {
                conversationMap[otherId] = {
                    recipientId: otherId,
                    lastMessage: msg.content,
                    lastMessageTime: msg.createdAt,
                    unread: msg.receiverId.toString() === req.user.id && !msg.read ? 1 : 0
                };
            } else if (msg.receiverId.toString() === req.user.id && !msg.read) {
                conversationMap[otherId].unread++;
            }
        });

        res.json(Object.values(conversationMap));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Send message
router.post('/send', verifyToken, async (req, res) => {
    try {
        const { receiverId, appointmentId, content, type, fileUrl } = req.body;
        const message = new Message({
            senderId: req.user.id,
            receiverId,
            appointmentId,
            content,
            type: type || 'text',
            fileUrl
        });
        await message.save();
        res.status(201).json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get chat history (parameterized route MUST be last)
router.get('/:recipientId', verifyToken, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { senderId: req.user.id, receiverId: req.params.recipientId },
                { senderId: req.params.recipientId, receiverId: req.user.id }
            ]
        }).sort({ createdAt: 1 });

        // Mark as read
        await Message.updateMany(
            { senderId: req.params.recipientId, receiverId: req.user.id, read: false },
            { read: true }
        );

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
