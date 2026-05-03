import React, { useState, useRef, useEffect } from 'react';
import useAuth from '../hooks/useAuth'; // ✅ Use centralized auth hook
import API from '../services/api';

/**
 * AI Chatbot Component
 * - Provides an AI assistant for marketplace users (product recommendations, order help, etc.)
 * - Uses backend /ai/chat endpoint (e.g., OpenAI or custom model)
 * - Stores conversation ID in localStorage to remember context across page reloads
 * - Shows typing indicator and basic markdown formatting
 */
const AIChatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  // Load conversation ID from localStorage on mount
  useEffect(() => {
    const savedConvId = localStorage.getItem('ai_chat_conversation');
    if (savedConvId) {
      setConversationId(savedConvId);
    } else {
      const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      setConversationId(newConvId);
      localStorage.setItem('ai_chat_conversation', newConvId);
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to AI backend
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await API.post('/ai/chat', {
        question: input,
        conversationId, // Pass conversation ID for context
      });

      const botMessage = {
        role: 'assistant',
        content: response.data.answer,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMessage]);

      // Update conversation ID if backend returns a new one
      if (response.data.conversationId) {
        const newId = response.data.conversationId;
        setConversationId(newId);
        localStorage.setItem('ai_chat_conversation', newId);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      const errorMsg = err.response?.data?.error || 'I am having trouble right now. Please try again later.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  // Clear conversation history (start fresh)
  const clearConversation = () => {
    const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setConversationId(newConvId);
    localStorage.setItem('ai_chat_conversation', newConvId);
    setMessages([]);
  };

  // Simple markdown-like formatter for bot responses
  const formatMessage = (text) => {
    // Bold **text**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Links (basic)
    formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return { __html: formatted };
  };

  if (!user) return null;

  return (
    <div style={styles.container}>
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} style={styles.chatButton}>
          🤖 AI Assistant
        </button>
      ) : (
        <div style={styles.chatWindow}>
          <div style={styles.chatHeader}>
            <span>🤖 AI Support Assistant</span>
            <button onClick={clearConversation} style={styles.clearBtn} title="Start new conversation">🔄</button>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>✕</button>
          </div>

          <div style={styles.messagesArea}>
            {messages.length === 0 && (
              <div style={styles.welcome}>
                Hi! I'm your AI assistant. I can help you find products, answer questions about orders, explain policies, and more.<br />
                <span style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px', display: 'block' }}>Example: "Show me best-selling electronics" or "How do I return an item?"</span>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.message,
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? '#007bff' : '#e9ecef',
                  color: msg.role === 'user' ? 'white' : '#333',
                }}
              >
                {msg.role === 'assistant' ? (
                  <div dangerouslySetInnerHTML={formatMessage(msg.content)} />
                ) : (
                  msg.content
                )}
                <div style={styles.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {loading && (
              <div style={styles.typing}>
                <span>●</span><span>●</span><span>●</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputArea}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything..."
              style={styles.input}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading} style={styles.sendBtn}>
              {loading ? '...' : 'Send'}
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
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s',
  },
  chatWindow: {
    width: '350px',
    height: '500px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 5px 20px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#6f42c1',
    color: 'white',
    fontWeight: 'bold',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    marginLeft: 'auto',
    marginRight: '8px',
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
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: '18px',
    marginBottom: '4px',
    wordWrap: 'break-word',
    lineHeight: '1.4',
  },
  timestamp: {
    fontSize: '10px',
    color: '#aaa',
    marginTop: '4px',
    textAlign: 'right',
  },
  typing: {
    display: 'flex',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#e9ecef',
    borderRadius: '18px',
    width: '50px',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  welcome: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '13px',
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#f1f3f5',
    borderRadius: '12px',
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
  sendBtn: {
    padding: '8px 16px',
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
  },
};

export default AIChatbot;