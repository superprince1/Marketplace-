import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SellerBadges from '../UI/SellerBadges'; // ✅ Import badge component

/**
 * ProductCard Component - Displays a single product in grid/list view
 * Features:
 * - Product image with uniform size (200px height for grid, 120px for list)
 * - Price display with optional compare-at price (sale badge)
 * - Stock status badge
 * - Discount badge
 * - Add to cart button
 * - Seller trust & reputation badges (NEW)
 */
const ProductCard = ({ 
  product, 
  onAddToCart, 
  showQuickView = false,
  layout = 'grid' // 'grid' or 'list'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);

  const {
    _id,
    name,
    price,
    compareAtPrice,
    images,
    imageUrl,
    sellerId,
    sellerName,
    stock,
    rating = 0,
    numReviews = 0,
    isActive = true
  } = product;

  // Extract seller badges from product object (populated in backend)
  // Expected structure: product.sellerId.shop.badges (or product.sellerId.badges if merged)
  const sellerBadges = product.sellerId?.shop?.badges || product.sellerId?.badges || [];

  // Determine primary image
  let primaryImage = null;
  if (images && images.length > 0) {
    const primary = images.find(img => img.isPrimary);
    primaryImage = primary ? primary.url : images[0].url;
  }
  const displayImage = primaryImage || imageUrl || null;
  const finalImage = (!imageError && displayImage) ? displayImage : 'https://via.placeholder.com/300x200?text=No+Image';

  const discountPercent = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock < 5;
  const formattedPrice = `$${price.toFixed(2)}`;
  const formattedComparePrice = compareAtPrice ? `$${compareAtPrice.toFixed(2)}` : null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock && onAddToCart) {
      onAddToCart(product, quantity);
      setQuantity(1);
    }
  };

  const renderStars = () => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    return (
      <div style={styles.stars}>
        {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} style={styles.starFull}>★</span>)}
        {hasHalfStar && <span style={styles.starHalf}>½</span>}
        {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} style={styles.starEmpty}>☆</span>)}
        <span style={styles.reviewCount}>({numReviews})</span>
      </div>
    );
  };

  // Shared seller info block (name + badges)
  const renderSellerInfo = () => {
    const sellerDisplayName = typeof sellerName === 'object' ? sellerName.name : sellerName;
    const sellerLink = `/seller/${sellerId?._id || sellerId}`;
    return (
      <div style={styles.sellerContainer}>
        <span style={styles.sellerLabel}>by</span>
        <Link to={sellerLink} style={styles.sellerLink}>
          {sellerDisplayName}
        </Link>
        {sellerBadges.length > 0 && (
          <SellerBadges badges={sellerBadges} size="sm" showTooltip={true} />
        )}
      </div>
    );
  };

  // Grid layout
  if (layout === 'grid') {
    return (
      <div 
        style={{
          ...styles.card,
          ...(isHovered ? styles.cardHover : {}),
          ...(isOutOfStock ? styles.cardOutOfStock : {})
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {discountPercent > 0 && (
          <div style={styles.discountBadge}>-{discountPercent}%</div>
        )}

        <Link to={`/product/${_id}`} style={styles.imageLink}>
          <div style={styles.imageContainer}>
            <img 
              src={finalImage} 
              alt={name} 
              style={styles.image}
              onError={() => setImageError(true)}
            />
            {isOutOfStock && <div style={styles.outOfStockOverlay}>Out of Stock</div>}
            {isLowStock && !isOutOfStock && <div style={styles.lowStockBadge}>Only {stock} left!</div>}
          </div>
        </Link>

        <div style={styles.info}>
          <Link to={`/product/${_id}`} style={styles.titleLink}>
            <h3 style={styles.title}>{name.length > 50 ? name.substring(0, 50) + '...' : name}</h3>
          </Link>

          {/* Seller info with badges */}
          {sellerDisplayName && renderSellerInfo()}

          {rating > 0 && renderStars()}

          <div style={styles.priceContainer}>
            <span style={styles.price}>{formattedPrice}</span>
            {formattedComparePrice && <span style={styles.oldPrice}>{formattedComparePrice}</span>}
          </div>

          <button 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            style={{
              ...styles.addToCartBtn,
              ...(isOutOfStock ? styles.addToCartBtnDisabled : {}),
              ...(isHovered && !isOutOfStock ? styles.addToCartBtnHover : {})
            }}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>

          {showQuickView && !isOutOfStock && (
            <button onClick={() => window.location.href = `/product/${_id}`} style={styles.quickViewBtn}>
              Quick View
            </button>
          )}
        </div>
      </div>
    );
  }

  // List layout
  const sellerDisplayName = typeof sellerName === 'object' ? sellerName.name : sellerName;
  return (
    <div style={styles.listCard}>
      <Link to={`/product/${_id}`} style={styles.listImageLink}>
        <img 
          src={finalImage} 
          alt={name} 
          style={styles.listImage}
          onError={() => setImageError(true)}
        />
      </Link>
      <div style={styles.listInfo}>
        <Link to={`/product/${_id}`} style={styles.titleLink}>
          <h3 style={styles.listTitle}>{name}</h3>
        </Link>
        <div style={styles.listSellerRow}>
          <span style={styles.sellerLabel}>Seller:</span>
          <Link to={`/seller/${sellerId?._id || sellerId}`} style={styles.sellerLink}>
            {sellerDisplayName}
          </Link>
          {sellerBadges.length > 0 && (
            <SellerBadges badges={sellerBadges} size="sm" showTooltip={true} />
          )}
        </div>
        {rating > 0 && renderStars()}
        <p style={styles.listDescription}>{product.description?.substring(0, 120)}...</p>
        <div style={styles.listPriceRow}>
          <div>
            <span style={styles.price}>{formattedPrice}</span>
            {formattedComparePrice && <span style={styles.oldPrice}>{formattedComparePrice}</span>}
          </div>
          <button 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            style={{
              ...styles.listAddToCartBtn,
              ...(isOutOfStock ? styles.addToCartBtnDisabled : {})
            }}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
        {isLowStock && !isOutOfStock && <div style={styles.lowStockText}>Only {stock} left - order soon!</div>}
      </div>
    </div>
  );
};

const styles = {
  // Grid card styles
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s, box-shadow 0.3s',
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
  },
  cardOutOfStock: {
    opacity: 0.7
  },
  discountBadge: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 2
  },
  imageLink: {
    textDecoration: 'none',
    display: 'block'
  },
  imageContainer: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden',
    backgroundColor: '#f8f9fa'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s'
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  lowStockBadge: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: '#ffc107',
    color: '#333',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  info: {
    padding: '12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  titleLink: {
    textDecoration: 'none'
  },
  title: {
    fontSize: '14px',
    fontWeight: '500',
    margin: 0,
    color: '#333',
    lineHeight: 1.4,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  sellerContainer: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    fontSize: '12px',
    color: '#666'
  },
  sellerLabel: {
    color: '#666',
    marginRight: '2px'
  },
  sellerLink: {
    color: '#007bff',
    textDecoration: 'none'
  },
  stars: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '12px'
  },
  starFull: {
    color: '#ffc107'
  },
  starHalf: {
    color: '#ffc107',
    fontSize: '10px'
  },
  starEmpty: {
    color: '#ddd'
  },
  reviewCount: {
    color: '#666',
    marginLeft: '4px',
    fontSize: '11px'
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  price: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#28a745'
  },
  oldPrice: {
    fontSize: '13px',
    color: '#999',
    textDecoration: 'line-through'
  },
  addToCartBtn: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.3s',
    marginTop: '8px'
  },
  addToCartBtnHover: {
    backgroundColor: '#0056b3'
  },
  addToCartBtnDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  quickViewBtn: {
    backgroundColor: 'transparent',
    color: '#007bff',
    border: '1px solid #007bff',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '4px',
    transition: 'all 0.3s'
  },

  // List layout styles
  listCard: {
    display: 'flex',
    gap: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '16px',
    padding: '12px'
  },
  listImageLink: {
    flexShrink: 0,
    width: '120px',
    height: '120px'
  },
  listImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '4px'
  },
  listInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  listTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    color: '#333'
  },
  listSellerRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '13px',
    color: '#666'
  },
  listDescription: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
    lineHeight: 1.4
  },
  listPriceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px'
  },
  listAddToCartBtn: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '6px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  lowStockText: {
    fontSize: '12px',
    color: '#ff6b6b',
    marginTop: '4px'
  }
};

export default ProductCard;