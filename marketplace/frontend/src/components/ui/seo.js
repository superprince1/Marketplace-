import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, image, url, type = 'website' }) => {
  const siteTitle = 'Your Marketplace';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const fullDescription = description || 'Shop the best products from trusted sellers.';
  const fullImage = image || 'https://yourdomain.com/default-og-image.jpg';
  const fullUrl = url || typeof window !== 'undefined' ? window.location.href : '';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullImage} />
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
};

export default SEO;