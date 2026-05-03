import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import StarRating from './StarRating';

const ReviewSection = ({ productId, productPurchased }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userReview, setUserReview] = useState({ rating: 5, title: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await API.get(`/reviews/product/${productId}`);
      setReviews(res.data.reviews);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/reviews', {
        productId,
        rating: userReview.rating,
        title: userReview.title,
        comment: userReview.comment,
      });
      setUserReview({ rating: 5, title: '', comment: '' });
      setShowForm(false);
      fetchReviews();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await API.put(`/reviews/${reviewId}/helpful`);
      fetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const alreadyReviewed = reviews.some((r) => r.userId?._id === user?.id);

  if (loading) return <div>Loading reviews...</div>;

  return (
    <div style={styles.container}>
      <h3>Customer Reviews ({reviews.length})</h3>

      {/* Write review button / form */}
      {user && productPurchased && !alreadyReviewed && (
        <div>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={styles.writeBtn}>
              Write a Review
            </button>
          ) : (
            <form onSubmit={handleSubmitReview} style={styles.form}>
              <h4>Your Review</h4>
              <StarRating value={userReview.rating} onChange={(r) => setUserReview({ ...userReview, rating: r })} />
              <input
                type="text"
                placeholder="Review title (optional)"
                value={userReview.title}
                onChange={(e) => setUserReview({ ...userReview, title: e.target.value })}
                style={styles.input}
              />
              <textarea
                rows="4"
                placeholder="Share your experience..."
                value={userReview.comment}
                onChange={(e) => setUserReview({ ...userReview, comment: e.target.value })}
                style={styles.textarea}
                required
              />
              <div style={styles.formActions}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 && <p>No reviews yet. Be the first!</p>}
      {reviews.map((review) => (
        <div key={review._id} style={styles.reviewCard}>
          <div style={styles.reviewHeader}>
            <strong>{review.userId?.name || 'Anonymous'}</strong>
            <StarRating value={review.rating} readonly size="small" />
            <span style={styles.date}>{new Date(review.createdAt).toLocaleDateString()}</span>
            {review.verifiedPurchase && <span style={styles.verifiedBadge}>✓ Verified Purchase</span>}
          </div>
          {review.title && <h5>{review.title}</h5>}
          <p>{review.comment}</p>
          <button onClick={() => handleHelpful(review._id)} style={styles.helpfulBtn}>
            👍 Helpful ({review.helpful})
          </button>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: { marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' },
  writeBtn: { padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  form: { backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', marginTop: '10px' },
  input: { width: '100%', padding: '8px', margin: '8px 0', border: '1px solid #ddd', borderRadius: '4px' },
  textarea: { width: '100%', padding: '8px', margin: '8px 0', border: '1px solid #ddd', borderRadius: '4px' },
  formActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  submitBtn: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  reviewCard: { borderBottom: '1px solid #eee', padding: '15px 0' },
  reviewHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' },
  date: { fontSize: '12px', color: '#999' },
  verifiedBadge: { fontSize: '11px', backgroundColor: '#d4edda', color: '#155724', padding: '2px 6px', borderRadius: '4px' },
  helpfulBtn: { background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '12px', marginTop: '8px' },
};

export default ReviewSection;