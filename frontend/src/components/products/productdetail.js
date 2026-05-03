import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import useCart from '../../hooks/useCart'; // ✅ Use cart hook instead of prop
import { getProduct, getMyOrders } from '../../services/api';
import StarRating from './StarRating';
import ReviewSection from './ReviewSection';
import WishlistButton from '../Wishlist/WishlistButton';
import ChatWidget from '../Chat/ChatWidget';
import SocialShare from '../UI/SocialShare';
import SkeletonProductDetail from '../UI/SkeletonProductDetail';
import ReactGA from 'react-ga4';

import FrequentlyBoughtTogether from '../Product/FrequentlyBoughtTogether';
import AlsoBought from '../Product/AlsoBought';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const { addItem } = useCart(); // ✅ Get addToCart function from hook

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [productPurchased, setProductPurchased] = useState(false);

  // Variation states
  const [selectedVariations, setSelectedVariations] = useState({});
  const [variationPrice, setVariationPrice] = useState(0);
  const [variationStock, setVariationStock] = useState(0);
  const [variationError, setVariationError] = useState('');

  // Fetch product details with language parameter
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const lang = i18n.language || 'en';
        const res = await getProduct(id, lang);
        const productData = res.data.product;
        setProduct(productData);
        setVariationPrice(productData.price);
        setVariationStock(productData.stock);
        if (window.gtag || ReactGA) {
          ReactGA.event({
            category: 'Ecommerce',
            action: 'view_item',
            label: productData.name,
            value: productData.price,
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || t('product.errors.loadFailed', 'Failed to load product'));
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, i18n.language, t]);

  // Check if user has purchased this product (for review eligibility)
  useEffect(() => {
    const checkPurchase = async () => {
      if (!isAuthenticated || !product) return;
      try {
        const ordersRes = await getMyOrders({ limit: 100 });
        const orders = ordersRes.data.orders;
        const purchased = orders.some(order =>
          order.status === 'delivered' &&
          order.items.some(item => item.productId === product._id)
        );
        setProductPurchased(purchased);
      } catch (err) {
        console.error('Failed to check purchase status', err);
      }
    };
    checkPurchase();
  }, [isAuthenticated, product]);

  // Update price and stock when variations change
  useEffect(() => {
    if (!product || !product.hasVariations) return;

    const allTypes = product.variations.map(v => v.type);
    const selectedTypes = Object.keys(selectedVariations);
    const allSelected = allTypes.every(type => selectedTypes.includes(type));

    if (!allSelected) {
      setVariationError(t('variation.selectAll', 'Please select all variation options'));
      setVariationPrice(product.price);
      setVariationStock(0);
      return;
    }

    setVariationError('');
    const firstType = allTypes[0];
    const selectedValue = selectedVariations[firstType];
    const variation = product.variations.find(v => v.type === firstType);
    const option = variation?.options.find(opt => opt.value === selectedValue);
    if (option) {
      setVariationPrice(product.price + (option.priceAdjustment || 0));
      setVariationStock(option.stock);
    } else {
      setVariationPrice(product.price);
      setVariationStock(product.stock);
    }
  }, [selectedVariations, product, t]);

  const handleVariationChange = (type, value) => {
    setSelectedVariations(prev => ({ ...prev, [type]: value }));
    setQuantity(1);
  };

  const handleQuantityChange = (newQty) => {
    if (newQty < 1) return;

    let maxAllowed = 0;
    if (preorderAvailable) {
      maxAllowed = product.preorderStock > 0 ? product.preorderStock : 9999;
    } else {
      maxAllowed = product?.hasVariations ? variationStock : product?.stock;
    }
    if (newQty > maxAllowed) return;
    setQuantity(newQty);
  };

  const handleAddToCart = async (productToAdd = product, qty = quantity, vars = selectedVariations) => {
    if (!productToAdd) return;
    if (productToAdd.hasVariations && variationError) {
      alert(variationError);
      return;
    }

    let stockAvailable = productToAdd.hasVariations ? variationStock : productToAdd.stock;
    let isPreorderCase = false;

    if (stockAvailable <= 0 && productToAdd.allowPreorder) {
      isPreorderCase = true;
      if (productToAdd.preorderStock > 0 && qty > productToAdd.preorderStock) {
        alert(t('product.preorderLimitExceeded', `Maximum preorder quantity is ${productToAdd.preorderStock}.`));
        return;
      }
    } else if (stockAvailable <= 0) {
      alert(t('product.outOfStock', 'This product/variant is out of stock'));
      return;
    } else if (qty > stockAvailable) {
      alert(t('product.insufficientStock', `Only ${stockAvailable} in stock.`));
      return;
    }

    setAddingToCart(true);
    try {
      await addItem(productToAdd, qty, vars);
      ReactGA.event({
        category: 'Ecommerce',
        action: 'add_to_cart',
        label: productToAdd.name,
        value: productToAdd.price,
      });
      alert(t('product.addedToCart', `${qty} × ${productToAdd.name} added to cart!`));
    } catch (err) {
      alert(t('product.addToCartFailed', 'Failed to add to cart'));
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.hasVariations && variationError) {
      alert(variationError);
      return;
    }
    const stockToCheck = product.hasVariations ? variationStock : product.stock;
    if (stockToCheck <= 0 && !product.allowPreorder) {
      alert(t('product.outOfStock', 'This product/variant is out of stock'));
      return;
    }
    addItem(product, quantity, selectedVariations);
    navigate('/cart');
  };

  const currentStock = product?.hasVariations ? variationStock : product?.stock;
  const preorderAvailable = product?.allowPreorder && currentStock <= 0;
  const preorderMessageText = product?.preorderMessage || t('product.preorderDefaultMessage', 'This item is available for pre‑order. Your order will be shipped on or before the estimated date.');
  const estimatedShipDateFormatted = product?.estimatedShipDate ? new Date(product.estimatedShipDate).toLocaleDateString() : null;

  const maxQuantity = preorderAvailable
    ? (product.preorderStock > 0 ? product.preorderStock : 9999)
    : (product?.hasVariations ? variationStock : product?.stock);

  const getStockStatus = () => {
    if (preorderAvailable) {
      return { text: t('product.availableForPreorder', 'Available for Pre‑order'), color: '#6c757d' };
    }
    if (currentStock <= 0) return { text: t('product.outOfStock', 'Out of Stock'), color: '#dc3545' };
    if (currentStock < 5) return { text: t('product.limitedStock', `Only ${currentStock} left!`), color: '#ffc107' };
    return { text: t('product.inStock', 'In Stock'), color: '#28a745' };
  };

  const stockStatus = getStockStatus();
  const discountPercent = product?.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const images = product?.images?.length
    ? product.images.map(img => img.url)
    : product?.imageUrl ? [product.imageUrl] : ['https://via.placeholder.com/600x400?text=No+Image'];

  const averageRating = product?.rating || product?.ratings?.average || 0;
  const reviewCount = product?.numReviews || product?.ratings?.count || 0;

  if (loading) return <SkeletonProductDetail />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!product) return <div className="alert alert-warning">{t('product.notFound', 'Product not found')}</div>;

  return (
    <>
      <Helmet>
        <title>{product.name} | Marketplace</title>
        <meta name="description" content={product.description?.substring(0, 160)} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description?.substring(0, 160)} />
        <meta property="og:image" content={images[0]} />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div style={styles.container}>
        {/* Breadcrumb */}
        <div style={styles.breadcrumb}>
          <span onClick={() => navigate('/')} style={styles.breadcrumbLink}>{t('nav.home', 'Home')}</span>
          <span style={styles.breadcrumbSep}>/</span>
          <span onClick={() => navigate(`/?category=${product.category}`)} style={styles.breadcrumbLink}>{product.category}</span>
          <span style={styles.breadcrumbSep}>/</span>
          <span style={styles.breadcrumbCurrent}>{product.name}</span>
        </div>

        <div style={styles.productContainer}>
          {/* Image Gallery */}
          <div style={styles.gallery}>
            <div style={styles.mainImage}>
              <img src={images[selectedImage]} alt={product.name} style={styles.mainImageImg} />
              {discountPercent > 0 && <div style={styles.discountBadge}>-{discountPercent}%</div>}
            </div>
            {images.length > 1 && (
              <div style={styles.thumbnails}>
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Thumb ${idx + 1}`}
                    style={{ ...styles.thumbnail, border: selectedImage === idx ? '2px solid #007bff' : '2px solid transparent' }}
                    onClick={() => setSelectedImage(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div style={styles.info}>
            <h1 style={styles.title}>{product.name}</h1>

            {/* Seller Info & Chat */}
            <div style={styles.sellerRow}>
              <div style={styles.sellerInfo}>
                {t('product.soldBy', 'Sold by')}: <strong>{product.sellerName}</strong>
              </div>
              {user && user.id !== product.sellerId?._id && (
                <ChatWidget sellerId={product.sellerId?._id} productId={product._id} sellerName={product.sellerName} />
              )}
            </div>

            {/* Rating */}
            <div style={styles.ratingRow}>
              <StarRating value={averageRating} readonly />
              <span style={styles.reviewCount}>({reviewCount} {t('product.reviews', 'reviews')})</span>
            </div>

            {/* Price */}
            <div style={styles.priceContainer}>
              <span style={styles.price}>${variationPrice.toFixed(2)}</span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <>
                  <span style={styles.oldPrice}>${product.compareAtPrice.toFixed(2)}</span>
                  <span style={styles.savings}>{t('product.save', 'Save')} ${(product.compareAtPrice - product.price).toFixed(2)}</span>
                </>
              )}
            </div>

            {/* Variations */}
            {product.hasVariations && product.variations.map(variation => (
              <div key={variation.type} style={styles.variationGroup}>
                <label style={styles.variationLabel}>{variation.name}:</label>
                <select
                  value={selectedVariations[variation.type] || ''}
                  onChange={(e) => handleVariationChange(variation.type, e.target.value)}
                  style={styles.variationSelect}
                >
                  <option value="">{t('variation.select', 'Select')} {variation.name}</option>
                  {variation.options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value} {opt.priceAdjustment !== 0 && `(+$${opt.priceAdjustment})`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {variationError && <div style={styles.variationError}>{variationError}</div>}

            {/* Stock / Preorder Status */}
            <div style={styles.stock}>
              <span style={{ ...styles.stockBadge, backgroundColor: stockStatus.color }}>
                {stockStatus.text}
              </span>
            </div>

            {/* Preorder Information (if available) */}
            {preorderAvailable && (
              <div style={styles.preorderInfo}>
                <div style={styles.preorderBadge}>🔮 {t('product.preorder', 'Pre‑order')}</div>
                <p style={styles.preorderMessage}>{preorderMessageText}</p>
                {estimatedShipDateFormatted && (
                  <p style={styles.shipDate}>
                    <strong>{t('product.estimatedShipDate', 'Estimated ship date')}:</strong> {estimatedShipDateFormatted}
                  </p>
                )}
                {product.preorderStock > 0 && (
                  <p style={styles.preorderLimit}>
                    {t('product.preorderLimit', `Only ${product.preorderStock} preorder slots available.`)}
                  </p>
                )}
              </div>
            )}

            {product.shortDescription && <p style={styles.shortDesc}>{product.shortDescription}</p>}

            {/* Quantity & Actions */}
            <div style={styles.actions}>
              <div style={styles.quantitySelector}>
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1 || (maxQuantity <= 0 && !preorderAvailable)}
                  style={styles.qtyBtn}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min="1"
                  max={maxQuantity > 0 ? maxQuantity : undefined}
                  style={styles.qtyInput}
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={(maxQuantity > 0 && quantity >= maxQuantity) || (maxQuantity <= 0 && !preorderAvailable)}
                  style={styles.qtyBtn}
                >
                  +
                </button>
              </div>
              <button
                onClick={() => handleAddToCart()}
                disabled={
                  addingToCart ||
                  (preorderAvailable ? false : currentStock <= 0) ||
                  (product.hasVariations && variationError) ||
                  (maxQuantity <= 0 && !preorderAvailable)
                }
                style={{ ...styles.addToCartBtn, opacity: (preorderAvailable ? 1 : (currentStock <= 0 ? 0.6 : 1)) }}
              >
                {addingToCart
                  ? t('cart.adding', 'Adding...')
                  : preorderAvailable
                    ? t('product.preorderNow', 'Pre‑order Now')
                    : currentStock <= 0
                      ? t('product.outOfStock', 'Out of Stock')
                      : t('product.addToCart', 'Add to Cart')}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={(preorderAvailable ? false : currentStock <= 0) || (product.hasVariations && variationError)}
                style={styles.buyNowBtn}
              >
                {t('product.buyNow', 'Buy Now')}
              </button>
            </div>

            {/* Wishlist Button */}
            <WishlistButton productId={product._id} />

            {/* Social Share */}
            <SocialShare url={window.location.href} title={product.name} />

            {/* Product Details Tabs */}
            <div style={styles.tabs}>
              <h4>{t('product.description', 'Description')}</h4>
              <p>{product.description}</p>
              {product.tags && product.tags.length > 0 && (
                <div style={styles.tags}>
                  <strong>{t('product.tags', 'Tags')}:</strong> {product.tags.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cross‑selling & Bundles */}
        <FrequentlyBoughtTogether productId={product._id} onAddToCart={handleAddToCart} />
        <AlsoBought productId={product._id} />

        {/* Reviews Section */}
        <ReviewSection productId={product._id} productPurchased={productPurchased} />
      </div>
    </>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  breadcrumb: { display: 'flex', gap: '8px', marginBottom: '20px', fontSize: '14px', flexWrap: 'wrap' },
  breadcrumbLink: { color: '#007bff', cursor: 'pointer' },
  breadcrumbSep: { color: '#999' },
  breadcrumbCurrent: { color: '#666' },
  productContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' },
  gallery: { position: 'sticky', top: '20px' },
  mainImage: { position: 'relative', backgroundColor: '#f8f9fa', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' },
  mainImageImg: { width: '100%', height: '400px', objectFit: 'cover' },
  discountBadge: { position: 'absolute', top: '16px', left: '16px', backgroundColor: '#dc3545', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' },
  thumbnails: { display: 'flex', gap: '10px', overflowX: 'auto' },
  thumbnail: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' },
  info: { display: 'flex', flexDirection: 'column', gap: '16px' },
  title: { fontSize: '28px', fontWeight: '600', margin: 0 },
  sellerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  sellerInfo: { fontSize: '14px', color: '#666' },
  ratingRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  reviewCount: { fontSize: '14px', color: '#666' },
  priceContainer: { display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' },
  price: { fontSize: '32px', fontWeight: 'bold', color: '#28a745' },
  oldPrice: { fontSize: '20px', color: '#999', textDecoration: 'line-through' },
  savings: { fontSize: '16px', color: '#28a745', fontWeight: '500' },
  variationGroup: { marginBottom: '12px' },
  variationLabel: { display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' },
  variationSelect: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '100%', maxWidth: '250px', backgroundColor: '#fff' },
  variationError: { color: '#dc3545', fontSize: '13px', marginTop: '-8px' },
  stock: { marginBottom: '8px' },
  stockBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', color: 'white' },
  preorderInfo: { backgroundColor: '#e9ecef', padding: '12px', borderRadius: '8px', marginTop: '8px', borderLeft: '4px solid #6c757d' },
  preorderBadge: { display: 'inline-block', backgroundColor: '#6c757d', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' },
  preorderMessage: { fontSize: '14px', margin: '8px 0', color: '#495057' },
  shipDate: { fontSize: '14px', margin: '4px 0', fontWeight: '500' },
  preorderLimit: { fontSize: '13px', color: '#dc3545', marginTop: '4px' },
  shortDesc: { fontSize: '16px', color: '#555', lineHeight: 1.5 },
  actions: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' },
  quantitySelector: { display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' },
  qtyBtn: { padding: '8px 16px', backgroundColor: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: '18px' },
  qtyInput: { width: '60px', textAlign: 'center', border: 'none', padding: '8px 0', fontSize: '16px' },
  addToCartBtn: { flex: 1, padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '500', cursor: 'pointer' },
  buyNowBtn: { flex: 1, padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: '500', cursor: 'pointer' },
  tabs: { marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' },
  tags: { marginTop: '8px', fontSize: '13px', color: '#666' },
};

export default ProductDetail;