import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const PageView = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await API.get(`/pages/${slug}`);
        setPage(res.data.page);
      } catch (err) {
        setError(err.response?.data?.error || 'Page not found');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!page) return <div style={styles.error}>Page not found</div>;

  // Determine container width based on template
  const containerStyle = {
    ...styles.container,
    maxWidth: page.template === 'full-width' ? '100%' : page.template === 'narrow' ? '800px' : '1000px',
  };

  return (
    <>
      <Helmet>
        <title>{page.metaTitle || page.title} | Marketplace</title>
        <meta name="description" content={page.metaDescription || page.excerpt || page.content.substring(0, 160).replace(/<[^>]*>/g, '')} />
        <meta property="og:title" content={page.metaTitle || page.title} />
        <meta property="og:description" content={page.metaDescription || page.excerpt || page.content.substring(0, 160).replace(/<[^>]*>/g, '')} />
        <link rel="canonical" href={`${window.location.origin}/pages/${page.slug}`} />
      </Helmet>

      <div style={containerStyle}>
        <h1 style={styles.title}>{page.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: page.content }} style={styles.content} />
      </div>
    </>
  );
};

const styles = {
  container: {
    margin: '0 auto',
    padding: '20px',
    lineHeight: 1.6,
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #eee',
    paddingBottom: '0.5rem',
  },
  content: {
    fontSize: '1.1rem',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '1.2rem',
    color: '#dc3545',
  },
};

export default PageView;