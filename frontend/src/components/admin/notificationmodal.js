// src/components/Admin/NotificationModal.js
import React, { useState } from 'react';

/**
 * NotificationModal Component
 * 
 * Modal for sending email notifications to selected users.
 * 
 * Features:
 * - Overlay with centered modal
 * - Subject and message inputs
 * - Character count for message
 * - Loading state while sending
 * - Cancel and Send buttons
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {function} props.onClose - Close callback
 * @param {Array} props.userIds - List of user IDs to notify
 * @param {function} props.onSend - Send callback (userIds, subject, message)
 */
const NotificationModal = ({ isOpen, onClose, userIds, onSend }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!message.trim()) {
      setError('Message is required');
      return;
    }
    setError('');
    setSending(true);
    try {
      await onSend(userIds, subject, message);
      // Clear form after successful send
      setSubject('');
      setMessage('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setSubject('');
      setMessage('');
      setError('');
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Send Notification</h3>
          <button onClick={handleClose} style={styles.closeBtn} disabled={sending}>
            ×
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.recipients}>
            Sending to <strong>{userIds.length}</strong> user{userIds.length !== 1 ? 's' : ''}
          </p>

          {error && <div style={styles.errorAlert}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Notification subject"
              style={styles.input}
              disabled={sending}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows="5"
              style={styles.textarea}
              disabled={sending}
            />
            <div style={styles.charCount}>{message.length} characters</div>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={handleClose} style={styles.cancelBtn} disabled={sending}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={sending} style={styles.sendBtn}>
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '550px',
    maxWidth: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    color: '#1a1a2e',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    lineHeight: 1,
  },
  body: {
    padding: '20px',
    flex: 1,
    overflowY: 'auto',
  },
  recipients: {
    marginBottom: '16px',
    fontSize: '14px',
    color: '#555',
  },
  errorAlert: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    fontSize: '14px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  charCount: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
    textAlign: 'right',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#f8f9fa',
    borderRadius: '0 0 12px 12px',
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  sendBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default NotificationModal;