import React from 'react';

const StarRating = ({ value, onChange, readonly = false, size = 'medium' }) => {
  const starSize = size === 'small' ? '18px' : '24px';
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (rating) => {
    if (!readonly && onChange) onChange(rating);
  };

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {stars.map((star) => (
        <span
          key={star}
          onClick={() => handleClick(star)}
          style={{
            fontSize: starSize,
            cursor: readonly ? 'default' : 'pointer',
            color: star <= value ? '#ffc107' : '#e4e5e9',
            transition: 'color 0.1s',
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default StarRating;