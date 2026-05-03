import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = async (reset = false) => {
    const currentPage = reset ? 1 : page;
    setLoading(true);
    try {
      const res = await API.get(`/social/feed?page=${currentPage}&limit=20`);
      const newActivities = res.data.activities;
      if (reset) {
        setActivities(newActivities);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
      }
      setHasMore(currentPage < res.data.pagination.pages);
      setPage(currentPage + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(true);
  }, []);

  const renderActivity = (activity) => {
    const user = activity.userId;
    const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });
    switch (activity.type) {
      case 'purchase':
        return (
          <div key={activity._id} style={styles.activityItem}>
            <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} style={styles.avatar} />
            <div>
              <strong>{user?.name}</strong> purchased <Link to={`/product/${activity.referenceId?._id}`}>{activity.metadata?.productName || 'a product'}</Link> • <span style={styles.time}>{timeAgo}</span>
            </div>
          </div>
        );
      case 'like':
        return (
          <div key={activity._id} style={styles.activityItem}>
            <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} style={styles.avatar} />
            <div>
              <strong>{user?.name}</strong> liked <Link to={`/product/${activity.referenceId?._id}`}>{activity.metadata?.productName || 'a product'}</Link> • <span style={styles.time}>{timeAgo}</span>
            </div>
          </div>
        );
      case 'follow':
        return (
          <div key={activity._id} style={styles.activityItem}>
            <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} style={styles.avatar} />
            <div>
              <strong>{user?.name}</strong> started following <Link to={`/seller/${activity.referenceId?._id}`}>{activity.metadata?.sellerName || 'a seller'}</Link> • <span style={styles.time}>{timeAgo}</span>
            </div>
          </div>
        );
      case 'review':
        return (
          <div key={activity._id} style={styles.activityItem}>
            <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} style={styles.avatar} />
            <div>
              <strong>{user?.name}</strong> reviewed <Link to={`/product/${activity.metadata?.productId}`}>{activity.metadata?.productName}</Link> – ★{activity.metadata?.rating} • <span style={styles.time}>{timeAgo}</span>
              <p style={styles.comment}>"{activity.metadata?.comment}"</p>
            </div>
          </div>
        );
      case 'shared_purchase':
        return (
          <div key={activity._id} style={styles.activityItem}>
            <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} style={styles.avatar} />
            <div>
              <strong>{user?.name}</strong> shared their purchase of <Link to={`/product/${activity.referenceId?._id}`}>{activity.metadata?.productName}</Link> • <span style={styles.time}>{timeAgo}</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading && activities.length === 0) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h3>Activity Feed</h3>
      {activities.length === 0 ? (
        <p>No activity yet. Follow sellers to see their updates!</p>
      ) : (
        <>
          {activities.map(renderActivity)}
          {hasMore && (
            <button onClick={() => fetchFeed()} disabled={loading} style={styles.loadMore}>
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: 600, margin: '0 auto', padding: 20 },
  activityItem: { display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' },
  time: { fontSize: 12, color: '#999', marginLeft: 8 },
  comment: { fontSize: 13, color: '#555', marginTop: 4, fontStyle: 'italic' },
  loadMore: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', marginTop: 16 },
};

export default ActivityFeed;