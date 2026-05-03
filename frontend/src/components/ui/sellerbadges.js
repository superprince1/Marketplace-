import React from 'react';
import { FaShieldAlt, FaTruck, FaStar, FaBolt, FaUserCheck, FaRocket } from 'react-icons/fa';

const badgeConfig = {
  verified_seller: { icon: <FaUserCheck />, label: 'Verified Seller', color: '#007bff', description: 'Identity & shop verified' },
  top_rated: { icon: <FaStar />, label: 'Top Rated Seller', color: '#ffc107', description: 'High performer' },
  on_time_shipping: { icon: <FaTruck />, label: 'On‑Time Shipping', color: '#28a745', description: 'Ships on time' },
  fast_shipping: { icon: <FaBolt />, label: 'Fast Shipping', color: '#17a2b8', description: 'Avg 2‑day delivery' },
  fast_responder: { icon: <FaBolt />, label: 'Fast Responder', color: '#fd7e14', description: 'Responds within 1 hour' },
  pro_seller: { icon: <FaShieldAlt />, label: 'Pro Seller', color: '#6f42c1', description: '500+ orders, 97% satisfaction' },
  rising_star: { icon: <FaRocket />, label: 'Rising Star', color: '#20c997', description: 'New promising seller' },
};

const SellerBadges = ({ badges, size = 'md', showTooltip = true }) => {
  if (!badges || badges.length === 0) return null;

  const sizeStyles = {
    sm: { fontSize: '12px', padding: '2px 8px', gap: '4px' },
    md: { fontSize: '13px', padding: '4px 10px', gap: '6px' },
    lg: { fontSize: '16px', padding: '6px 14px', gap: '8px' },
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {badges.map((badge, idx) => {
        const config = badgeConfig[badge.name];
        if (!config) return null;
        return (
          <div
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: `${config.color}15`,
              border: `1px solid ${config.color}`,
              borderRadius: '30px',
              color: config.color,
              ...sizeStyles[size],
            }}
            title={showTooltip ? config.description : undefined}
          >
            <span style={{ marginRight: '4px' }}>{config.icon}</span>
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default SellerBadges;