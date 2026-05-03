const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { notifyUser } = require('../services/notificationService');
const rateLimit = require('express-rate-limit');

// Rate limiting for sending messages (prevent spam)
const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute per user
  message: { success: false, error: 'Too many messages, please slow down' },
});

// Helper: generate unique conversation ID
const generateConversationId = (userId1, userId2) => {
  const ids = [userId1, userId2].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Helper: sanitize message content (basic XSS prevention)
const sanitizeMessage = (text) => {
  return text.replace(/[<>]/g, '').trim();
};

// ========== GET ALL CONVERSATIONS ==========
/**
 * @route   GET /api/chat/conversations
 * @desc    Get list of conversations for the authenticated user
 * @access  Private
 */
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Aggregate to get latest message per conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$message' },
          lastMessageTime: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$read', false] }],
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { convId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', { $arrayElemAt: [{ $split: ['$$convId', '_'] }, 0] }] },
                    { $eq: ['$_id', { $arrayElemAt: [{ $split: ['$$convId', '_'] }, 1] }] },
                  ],
                },
              },
            },
            { $project: { name: 1, email: 1, avatar: 1 } },
          ],
          as: 'participants',
        },
      },
      {
        $addFields: {
          otherUser: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$participants',
                  cond: { $ne: ['$$this._id', userId] },
                },
              },
              0,
            ],
          },
        },
      },
      { $sort: { lastMessageTime: -1 } },
    ]);

    res.json({ success: true, conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== GET MESSAGES FOR A CONVERSATION ==========
/**
 * @route   GET /api/chat/:conversationId
 * @desc    Get messages for a specific conversation with pagination
 * @access  Private
 */
router.get(
  '/:conversationId',
  auth,
  param('conversationId').isString().trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { conversationId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      // Verify user is part of this conversation
      const [user1, user2] = conversationId.split('_');
      if (user1 !== req.user.id && user2 !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }

      const messages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name avatar')
        .populate('receiverId', 'name avatar');

      // Mark unread messages as read (async, no await needed for response)
      Message.updateMany(
        { conversationId, receiverId: req.user.id, read: false },
        { $set: { read: true } }
      ).catch(console.error);

      res.json({
        success: true,
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total: await Message.countDocuments({ conversationId }),
        },
      });
    } catch (err) {
      console.error('Get messages error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ========== GET UNREAD MESSAGE COUNT ==========
/**
 * @route   GET /api/chat/unread/count
 * @desc    Get total number of unread messages for the user
 * @access  Private
 */
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      read: false,
    });
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== SEND A NEW MESSAGE ==========
/**
 * @route   POST /api/chat
 * @desc    Send a new message (with optional file attachment)
 * @access  Private
 */
router.post(
  '/',
  auth,
  sendMessageLimiter,
  [
    body('receiverId').isMongoId().withMessage('Valid receiver ID required'),
    body('message').optional().trim().escape().isLength({ max: 2000 }),
    body('attachmentUrl').optional().isURL(),
    body('attachmentType').optional().isIn(['image', 'document', 'file']),
    body('conversationId').optional().isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { receiverId, message, attachmentUrl, attachmentType, conversationId } = req.body;
      const senderId = req.user.id;

      if (!message && !attachmentUrl) {
        return res.status(400).json({ success: false, error: 'Message or attachment required' });
      }

      const finalConversationId = conversationId || generateConversationId(senderId, receiverId);

      const newMessage = new Message({
        conversationId: finalConversationId,
        senderId,
        receiverId,
        message: message ? sanitizeMessage(message) : '',
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        read: false,
        createdAt: new Date(),
      });

      await newMessage.save();
      await newMessage.populate('senderId', 'name avatar');

      // Send real‑time notification to receiver
      const sender = await User.findById(senderId).select('name');
      const notificationMessage = attachmentUrl
        ? `📎 ${sender.name} sent an attachment`
        : (message.length > 100 ? message.substring(0, 100) + '...' : message);
      await notifyUser(
        receiverId,
        'chat_message',
        `New message from ${sender.name}`,
        notificationMessage,
        `/chat?conversation=${finalConversationId}`,
        { senderId, conversationId: finalConversationId, hasAttachment: !!attachmentUrl }
      );

      // Emit via Socket.io (if socket is available, handle in client)
      // The client will listen for 'newMessage' event

      res.status(201).json({ success: true, message: newMessage });
    } catch (err) {
      console.error('Send message error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ========== TYPING INDICATOR (Server‑side storage optional) ==========
/**
 * @route   POST /api/chat/typing
 * @desc    Broadcast typing indicator (stored in Redis or broadcast via Socket.io)
 * @access  Private
 */
router.post(
  '/typing',
  auth,
  [body('receiverId').isMongoId(), body('isTyping').isBoolean()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { receiverId, isTyping } = req.body;
      const senderId = req.user.id;

      // In a real implementation, you would publish this to Redis or directly via Socket.io
      // For now, just acknowledge. The client will handle the WebSocket event.
      res.json({ success: true, message: isTyping ? 'Typing...' : 'Stopped typing' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ========== MARK CONVERSATION AS READ ==========
/**
 * @route   PUT /api/chat/:conversationId/read
 * @desc    Mark all messages in a conversation as read
 * @access  Private
 */
router.put(
  '/:conversationId/read',
  auth,
  param('conversationId').isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { conversationId } = req.params;
      const result = await Message.updateMany(
        { conversationId, receiverId: req.user.id, read: false },
        { $set: { read: true } }
      );
      res.json({ success: true, updatedCount: result.modifiedCount });
    } catch (err) {
      console.error('Mark read error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ========== DELETE ENTIRE CONVERSATION ==========
/**
 * @route   DELETE /api/chat/:conversationId
 * @desc    Delete all messages in a conversation (soft delete by marking deletedFor)
 * @access  Private
 */
router.delete(
  '/:conversationId',
  auth,
  param('conversationId').isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { conversationId } = req.params;
      // Soft delete: set deletedFor array (or hard delete depending on policy)
      // For simplicity, we hard delete. For GDPR compliance, you may want to soft delete.
      const result = await Message.deleteMany({ conversationId });
      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} messages`,
      });
    } catch (err) {
      console.error('Delete conversation error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ========== DELETE SINGLE MESSAGE ==========
/**
 * @route   DELETE /api/chat/message/:messageId
 * @desc    Delete a single message (user can only delete own messages)
 * @access  Private
 */
router.delete(
  '/message/:messageId',
  auth,
  param('messageId').isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const message = await Message.findById(req.params.messageId);
      if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      if (message.senderId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'You can only delete your own messages' });
      }
      await message.remove();
      res.json({ success: true, message: 'Message deleted' });
    } catch (err) {
      console.error('Delete message error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;