import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [page]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/blog/posts?page=${page}&limit=9`);
      setPosts(res.data.posts);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <h1>Marketplace News & Blog</h1>
      <div style={styles.grid}>
        {posts.map((post) => (
          <div key={post._id} style={styles.card}>
            {post.featuredImage && <img src={post.featuredImage} alt={post.title} style={styles.image} />}
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <Link to={`/blog/${post.slug}`}>Read more →</Link>
          </div>
        ))}
      </div>
      {pagination && pagination.pages > 1 && (
        <div style={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pagination.pages}
          </span>
          <button disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  card: { backgroundColor: '#fff', borderRadius: '8px', padding: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  image: { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' },
  pagination: { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px' },
};

export default BlogList;