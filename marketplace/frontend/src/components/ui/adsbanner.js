import React, { useState, useEffect } from 'react';
import API from '../../services/api';

const AdBanner = () => {
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const res = await API.get('/admin/settings/monetization');
        const settings = res.data.settings;
        if (settings.enableAdvertisingBanner) {
          setBanner({
            html: settings.bannerHtml,
            image: settings.bannerImage,
            link: settings.bannerLink,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchBanner();
  }, []);
  if (!banner) return null;
  if (banner.html) {
    return <div dangerouslySetInnerHTML={{ __html: banner.html }} />;
  }
  if (banner.image) {
    return (
      <a href={banner.link} target="_blank" rel="noopener noreferrer">
        <img src={banner.image} alt="Advertisement" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
      </a>
    );
  }
  return null;
};

export default AdBanner;