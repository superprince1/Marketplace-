import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { registerServiceWorker, subscribeUserToPush } from '../../utils/pushNotifications';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Register service worker and subscribe to push (once)
      registerServiceWorker().then(() => subscribeUserToPush());
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications?limit=10');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    await API.put(`/notifications/${id}/read`);
    setNotifications(prev =>
      prev.map(n => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await API.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} style={styles.bellButton}>
        🔔 {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
      </button>
      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={styles.markAllBtn}>Mark all as read</button>
            )}
          </div>
          <div style={styles.list}>
            {notifications.length === 0 && <div style={styles.empty}>No notifications</div>}
            {notifications.map(notif => (
              <div key={notif._id} style={{ ...styles.item, backgroundColor: notif.read ? '#fff' : '#f0f7ff' }}>
                <Link to={notif.link} onClick={() => markAsRead(notif._id)} style={styles.link}>
                  <div style={styles.title}>{notif.title}</div>
                  <div style={styles.message}>{notif.message}</div>
                  <small>{new Date(notif.createdAt).toLocaleString()}</small>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { position: 'relative', display: 'inline-block' },
  bellButton: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', position: 'relative' },
  badge: { position: 'absolute', top: -5, right: -5, background: '#dc3545', color: 'white', borderRadius: '50%', padding: '0 5px', fontSize: '0.7rem', fontWeight: 'bold' },
  dropdown: { position: 'absolute', top: '40px', right: 0, width: '320px', maxHeight: '400px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #eee', fontWeight: 'bold' },
  markAllBtn: { background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.8rem' },
  list: { overflowY: 'auto', flex: 1 },
  item: { borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' },
  link: { display: 'block', padding: '10px', textDecoration: 'none', color: '#333' },
  title: { fontWeight: '500', marginBottom: '4px' },
  message: { fontSize: '0.85rem', color: '#666', marginBottom: '4px' },
  empty: { padding: '20px', textAlign: 'center', color: '#999' },
};

export default NotificationBell;