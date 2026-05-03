const mongoose = require('mongoose');

/**
 * Message Schema for Chat System
 * 
 * Features:
 * - Tracks individual messages between users
 * - Supports conversation grouping (conversationId)
 * - Read receipts (read flag)
 * - Timestamps for sorting
 * - Populates sender/receiver info when queried
 */
const MessageSchema = new mongoose.Schema(
  {
    // Unique identifier for a conversation (e.g., "userId1_userId2_productId")
    conversationId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    // Sender of the message
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Receiver of the message
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Message content
    message: {
      type: String,
      required: [true, 'Message cannot be empty'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    // Read status (whether receiver has seen the message)
    read: {
      type: Boolean,
      default: false,
    },
    // Optional: attachment (file URL from Cloudinary)
    attachment: {
      url: { type: String },
      filename: { type: String },
      mimeType: { type: String },
    },
    // Soft delete (optional)
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========== INDEXES ==========
// For fast querying of conversation history
MessageSchema.index({ conversationId: 1, createdAt: 1 });
// For finding unread messages
MessageSchema.index({ receiverId: 1, read: 1 });
// For sorting messages by newest first
MessageSchema.index({ createdAt: -1 });

// ========== INSTANCE METHODS ==========

/**
 * Mark a single message as read
 */
MessageSchema.methods.markAsRead = async function () {
  this.read = true;
  await this.save();
  return this;
};

/**
 * Soft delete a message (only for the user who deletes it)
 * In a real app, you may want to implement two‑sided deletion.
 */
MessageSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedBy = userId;
  await this.save();
  return this;
};

// ========== STATIC METHODS ==========

/**
 * Get all messages for a conversation, sorted by oldest first (chronological)
 * @param {string} conversationId - The conversation ID
 * @param {number} limit - Number of messages to fetch (pagination)
 * @param {number} skip - Number of messages to skip
 */
MessageSchema.statics.getConversation = function (conversationId, limit = 50, skip = 0) {
  return this.find({ conversationId, isDeleted: false })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'name avatar')
    .populate('receiverId', 'name avatar');
};

/**
 * Mark all messages in a conversation as read for a specific user (receiver)
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The receiver's user ID
 */
MessageSchema.statics.markAllAsRead = async function (conversationId, userId) {
  await this.updateMany(
    { conversationId, receiverId: userId, read: false },
    { $set: { read: true } }
  );
};

/**
 * Get unread message count for a specific user
 * @param {string} userId - The user ID
 */
MessageSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ receiverId: userId, read: false, isDeleted: false });
};

/**
 * Delete all messages in a conversation (hard delete – admin only)
 * @param {string} conversationId - The conversation ID
 */
MessageSchema.statics.deleteConversation = async function (conversationId) {
  await this.deleteMany({ conversationId });
};

// ========== VIRTUAL PROPERTIES ==========

// Virtual for formatted message preview (for notifications)
MessageSchema.virtual('preview').get(function () {
  return this.message.length > 50 ? this.message.substring(0, 50) + '...' : this.message;
});

// Virtual for short timestamp (e.g., "2h ago") – useful for UI
MessageSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return this.createdAt.toLocaleDateString();
});

module.exports = mongoose.model('Message', MessageSchema);