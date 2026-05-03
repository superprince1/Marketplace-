import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import SocialShare from '../UI/SocialShare';

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPost();
    window.scrollTo(0, 0);
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/blog/posts/${slug}`);
      setPost(res.data.post);
      // Fetch related posts (same category, exclude current)
      if (res.data.post.category) {
        const relatedRes = await API.get(`/blog/posts?category=${res.data.post.category}&limit=3&exclude=${res.data.post._id}`);
        setRelatedPosts(relatedRes.data.posts || []);
      }
    } catch (err) {
      console.error('Error fetching blog post:', err);
      setError(err.response?.data?.error || 'Failed to load blog post');
    } finally {
      setLoading(false);
    }
  };

  // Helper: calculate reading time (approx 200 words per minute)
  const getReadingTime = (content) => {
    const words = content?.replace(/<[^>]*>/g, '').split(/\s+/).length || 0;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={styles.error}>⚠️ {error}</div>;
  if (!post) return <div style={styles.notFound}>Post not found</div>;

  const fullUrl = `${process.env.REACT_APP_CLIENT_URL || window.location.origin}/blog/${post.slug}`;
  const readingTime = getReadingTime(post.content);
  const publishedDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Helmet>
        <title>{post.metaTitle || post.title} | Marketplace Blog</title>
        <meta name="description" content={post.metaDescription || post.excerpt || post.content?.substring(0, 160)?.replace(/<[^>]*>/g, '')} />
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta property="og:description" content={post.metaDescription || post.excerpt || post.content?.substring(0, 160)?.replace(/<[^>]*>/g, '')} />
        <meta property="og:image" content={post.featuredImage || post.ogImage || 'https://yourdomain.com/default-blog-og.jpg'} />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.publishedAt || post.createdAt} />
        <meta property="article:author" content={post.author?.name} />
        {post.tags?.map((tag, i) => (
          <meta key={i} property="article:tag" content={tag} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.metaTitle || post.title} />
        <meta name="twitter:description" content={post.metaDescription || post.excerpt || post.content?.substring(0, 160)?.replace(/<[^>]*>/g, '')} />
        <meta name="twitter:image" content={post.featuredImage || post.ogImage} />
        <link rel="canonical" href={fullUrl} />
      </Helmet>

      <div style={styles.container}>
        {/* Breadcrumb */}
        <div style={styles.breadcrumb}>
          <Link to="/">Home</Link> / <Link to="/blog">Blog</Link> / <span>{post.title}</span>
        </div>

        <article>
          {/* Featured Image */}
          {post.featuredImage && (
            <img src={post.featuredImage} alt={post.title} style={styles.image} />
          )}

          {/* Title & Meta */}
          <h1 style={styles.title}>{post.title}</h1>
          <div style={styles.meta}>
            <span>✍️ By {post.author?.name || 'Admin'}</span>
            <span>📅 {publishedDate}</span>
            <span>⏱️ {readingTime}</span>
            <span>👁️ {post.views || 0} views</span>
          </div>

          {/* Categories / Tags */}
          {post.category && (
            <div style={styles.category}>
              Category: <Link to={`/blog?category=${post.category}`}>{post.category}</Link>
            </div>
          )}
          {post.tags && post.tags.length > 0 && (
            <div style={styles.tags}>
              Tags: {post.tags.map((tag, idx) => (
                <Link key={idx} to={`/blog?tag=${tag}`} style={styles.tag}>#{tag}</Link>
              ))}
            </div>
          )}

          {/* Content */}
          <div dangerouslySetInnerHTML={{ __html: post.content }} style={styles.content} />

          {/* Social Share */}
          <div style={styles.shareSection}>
            <h4>Share this post</h4>
            <SocialShare url={fullUrl} title={post.title} />
          </div>

          {/* Author Bio */}
          {post.author && (
            <div style={styles.authorBio}>
              <img src={post.author.avatar || '/default-avatar.png'} alt={post.author.name} style={styles.authorAvatar} />
              <div>
                <h4>About {post.author.name}</h4>
                <p>{post.author.bio || 'Writer and contributor'}</p>
              </div>
            </div>
          )}

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div style={styles.relatedSection}>
              <h3>Related Articles</h3>
              <div style={styles.relatedGrid}>
                {relatedPosts.map(related => (
                  <Link key={related._id} to={`/blog/${related.slug}`} style={styles.relatedCard}>
                    {related.featuredImage && <img src={related.featuredImage} alt={related.title} style={styles.relatedImage} />}
                    <h4>{related.title}</h4>
                    <small>{new Date(related.publishedAt || related.createdAt).toLocaleDateString()}</small>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  breadcrumb: {
    fontSize: '14px',
    marginBottom: '20px',
    color: '#666',
  },
  image: {
    width: '100%',
    borderRadius: '12px',
    marginBottom: '24px',
    objectFit: 'cover',
    maxHeight: '500px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '16px',
    lineHeight: 1.2,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #eee',
  },
  category: {
    marginBottom: '12px',
    fontSize: '14px',
  },
  tags: {
    marginBottom: '24px',
    fontSize: '14px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    padding: '4px 10px',
    borderRadius: '20px',
    textDecoration: 'none',
    color: '#007bff',
    fontSize: '12px',
  },
  content: {
    lineHeight: 1.8,
    fontSize: '1.1rem',
    marginBottom: '32px',
  },
  shareSection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #eee',
    textAlign: 'center',
  },
  authorBio: {
    display: 'flex',
    gap: '20px',
    marginTop: '40px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '12px',
    alignItems: 'center',
  },
  authorAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  relatedSection: {
    marginTop: '48px',
  },
  relatedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '16px',
  },
  relatedCard: {
    textDecoration: 'none',
    color: '#333',
    border: '1px solid #eee',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'transform 0.2s',
  },
  relatedImage: {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#dc3545',
  },
  notFound: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
  },
};

export default BlogPost;