import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import useSocket from '../../hooks/useSocket';
import API from '../../services/api';

const ChatWidget = ({ sellerId, productId, sellerName }) => {
  const { user } = useAuth();
  const { isConnected, joinConversation, sendMessage: emitMessage, onEvent, offEvent } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Generate conversation ID
  useEffect(() => {
    if (!user || !sellerId) return;
    const ids = [user.id, sellerId].sort();
    const convId = `${ids[0]}_${ids[1]}${productId ? `_${productId}` : ''}`;
    setConversationId(convId);
  }, [user, sellerId, productId]);

  // Fetch message history when conversation ID is ready
  useEffect(() => {
    if (!conversationId) return;
    const fetchMessages = async () => {
      try {
        const res = await API.get(`/chat/${conversationId}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };
    fetchMessages();
  }, [conversationId]);

  // Join conversation when socket is connected
  useEffect(() => {
    if (isConnected && conversationId) {
      joinConversation(conversationId);
    }
  }, [isConnected, conversationId, joinConversation]);

  // Socket event handlers
  useEffect(() => {
    if (!conversationId) return;

    const handleNewMessage = (data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => [...prev, data]);
        // Mark as read if chat is open
        if (isOpen && data.senderId === sellerId) {
          markConversationRead();
        } else if (data.senderId === sellerId && !isOpen) {
          setUnreadCount(prev => prev + 1);
        }
      }
    };

    const handleTyping = (data) => {
      if (data.conversationId === conversationId && data.senderId === sellerId) {
        setOtherUserTyping(data.isTyping);
      }
    };

    onEvent('newMessage', handleNewMessage);
    onEvent('typing', handleTyping);

    return () => {
      offEvent('newMessage', handleNewMessage);
      offEvent('typing', handleTyping);
    };
  }, [conversationId, sellerId, isOpen, onEvent, offEvent]);

  // Mark conversation as read (API + UI)
  const markConversationRead = useCallback(async () => {
    try {
      await API.put(`/chat/${conversationId}/read`);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when chat opens
  useEffect(() => {
    if (isOpen && conversationId) {
      markConversationRead();
    }
  }, [isOpen, conversationId, markConversationRead]);

  // Send message (text or file)
  const sendMessage = async (text, file = null) => {
    if (!text?.trim() && !file) return;

    let attachmentUrl = null;
    let attachmentType = null;

    if (file) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await API.post('/upload/chat', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        attachmentUrl = uploadRes.data.url;
        attachmentType = file.type.startsWith('image/') ? 'image' : 'document';
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Failed to upload file');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const messageData = {
      conversationId,
      receiverId: sellerId,
      message: text?.trim() || '',
      attachmentUrl,
      attachmentType,
    };

    // Emit via socket for real‑time
    emitMessage(conversationId, {
      senderId: user.id,
      senderName: user.name,
      message: messageData.message,
      attachmentUrl,
      attachmentType,
      timestamp: new Date().toISOString(),
    });

    // Save to database
    try {
      await API.post('/chat', messageData);
    } catch (err) {
      console.error('Failed to save message:', err);
    }

    // Optimistically add to UI
    const optimisticMessage = {
      _id: Date.now(),
      ...messageData,
      senderId: user.id,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { conversationId, isTyping: true, senderId: user.id });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { conversationId, isTyping: false, senderId: user.id });
    }, 1000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      alert('File must be smaller than 5MB');
      return;
    }
    sendMessage(null, file);
    e.target.value = '';
  };

  if (!user) return null;

  return (
    <div style={styles.container}>
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} style={styles.chatButton}>
          💬 Chat with Seller
          {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
        </button>
      ) : (
        <div style={styles.chatWindow}>
          <div style={styles.chatHeader}>
            <span>Chat with {sellerName || 'Seller'}</span>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>✕</button>
          </div>

          <div style={styles.messagesArea}>
            {messages.map((msg, idx) => (
              <div
                key={msg._id || idx}
                style={{
                  ...styles.message,
                  alignSelf: msg.senderId === user.id ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.senderId === user.id ? '#007bff' : '#e9ecef',
                  color: msg.senderId === user.id ? 'white' : '#333',
                }}
              >
                {msg.attachmentUrl && (
                  <div style={styles.attachment}>
                    {msg.attachmentType === 'image' ? (
                      <img src={msg.attachmentUrl} alt="attachment" style={styles.attachmentImage} />
                    ) : (
                      <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">📎 Download</a>
                    )}
                  </div>
                )}
                <div>{msg.message}</div>
                <small>{new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
              </div>
            ))}
            {otherUserTyping && (
              <div style={styles.typingIndicator}>Seller is typing...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputArea}>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(newMessage)}
              placeholder="Type a message..."
              style={styles.input}
              disabled={uploading}
            />
            <button onClick={() => fileInputRef.current.click()} style={styles.attachBtn} title="Attach file">
              📎
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
            />
            <button onClick={() => sendMessage(newMessage)} style={styles.sendBtn} disabled={uploading}>
              {uploading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 },
  chatButton: {
    padding: '12px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    backgroundColor: '#dc3545',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 6px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  chatWindow: {
    width: '360px',
    height: '500px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    fontWeight: 'bold',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
  },
  messagesArea: {
    flex: 1,
    padding: '12px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#f8f9fa',
  },
  message: {
    maxWidth: '75%',
    padding: '8px 12px',
    borderRadius: '18px',
    marginBottom: '4px',
    wordWrap: 'break-word',
  },
  attachment: { marginBottom: '4px' },
  attachmentImage: { maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' },
  typingIndicator: {
    fontSize: '12px',
    color: '#6c757d',
    fontStyle: 'italic',
    padding: '4px 12px',
  },
  inputArea: {
    display: 'flex',
    padding: '10px',
    borderTop: '1px solid #ddd',
    alignItems: 'center',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '20px',
    outline: 'none',
  },
  attachBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
  },
  sendBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
  },
};

export default ChatWidget;