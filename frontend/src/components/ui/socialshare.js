import React from 'react';

const SocialShare = ({ url, title }) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>Share this:</span>
      <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" style={styles.link}>
        📘 Facebook
      </a>
      <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" style={styles.link}>
        🐦 Twitter
      </a>
      <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" style={styles.link}>
        🔗 LinkedIn
      </a>
      <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" style={styles.link}>
        📱 WhatsApp
      </a>
      <a href={shareLinks.reddit} target="_blank" rel="noopener noreferrer" style={styles.link}>
        🤖 Reddit
      </a>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: '20px',
    padding: '10px 0',
    borderTop: '1px solid #eee',
  },
  label: { fontWeight: '500', color: '#333' },
  link: { textDecoration: 'none', color: '#007bff', fontSize: '14px' },
};

export default SocialShare;