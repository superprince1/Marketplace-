import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart'; // ✅ Cart hook
import { checkout } from '../../services/api';
import API from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import ReactGA from 'react-ga4';

/**
 * Cart Component – Full checkout with live payment gateways
 * Supports: Stripe, PayPal, Paystack, Coinbase (redirects), Cash on Delivery
 * Fully supports product variations, preorders, store credit, gift cards,
 * BUYER SUBSCRIPTIONS, ADVANCED SHIPPING (dynamic rates, delivery date),
 * and DYNAMIC TAX AUTOMATION.
 * 
 * Uses centralized cart state via useCart hook.
 */
const Cart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    items: cart,
    addItem: addToCart,
    removeItem: removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    subtotal: subtotalRaw,
  } = useCart();

  // ========== Subscription state ==========
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // ========== Advanced Shipping state ==========
  const [totalWeight, setTotalWeight] = useState(0);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState('');
  const [availableDeliveryDates, setAvailableDeliveryDates] = useState([]);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);

  // ========== Tax Automation state ==========
  const [taxAmount, setTaxAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxLoading, setTaxLoading] = useState(false);

  // ========== Helper: Render variation badges ==========
  const renderVariations = (selectedVariations) => {
    if (!selectedVariations || Object.keys(selectedVariations).length === 0) return null;
    return (
      <div style={styles.variationDetails}>
        {Object.entries(selectedVariations).map(([type, value]) => (
          <span key={type} style={styles.variationBadge}>
            {type}: {value}
          </span>
        ))}
      </div>
    );
  };

  // ========== Check for payment redirect results ==========
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get('payment_status');
    const orderId = params.get('orderId');
    if (paymentStatus === 'success' && orderId) {
      clearCart();
      API.delete('/cart/clear').catch(console.error);
      ReactGA.event({
        category: 'Ecommerce',
        action: 'purchase',
        label: orderId,
        value: effectiveTotal,
      });
      navigate(`/order/${orderId}`, { replace: true });
    } else if (paymentStatus === 'failed') {
      alert('Payment failed. Please try again.');
      setCheckoutStep('payment');
    }
  }, [location, clearCart, navigate]);

  // ========== Cart base calculations ==========
  const baseShipping = subtotalRaw >= 50 ? 0 : 5.99;
  const baseTotal = subtotalRaw + baseShipping;

  // ========== Apply subscription perks (no tax yet) ==========
  const getDiscountedTotals = () => {
    if (!subscription || !subscription.isActive || !subscription.planId) {
      return {
        subtotal: subtotalRaw,
        shippingCost: baseShipping,
        discountAmount: 0,
        freeShippingApplied: false,
        discountPercent: 0,
      };
    }
    const perks = subscription.planId.perks || {};
    let newSubtotal = subtotalRaw;
    const discountPercent = perks.discountPercent || 0;
    if (discountPercent > 0) {
      newSubtotal = subtotalRaw * (1 - discountPercent / 100);
    }
    let newShipping = baseShipping;
    let freeShippingApplied = false;
    if (perks.freeShipping) {
      newShipping = 0;
      freeShippingApplied = true;
    }
    return {
      subtotal: newSubtotal,
      shippingCost: newShipping,
      discountAmount: subtotalRaw - newSubtotal,
      freeShippingApplied,
      discountPercent,
    };
  };

  const discounted = getDiscountedTotals();
  const {
    subtotal: displaySubtotal,
    shippingCost: displayShipping,
    discountAmount: subscriptionDiscount,
    freeShippingApplied,
    discountPercent,
  } = discounted;

  // ========== UI state ==========
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [shippingAddress, setShippingAddress] = useState({
    street: '', city: '', state: '', zipCode: '', country: 'USA', instructions: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // ========== Store Credit & Gift Card states ==========
  const [storeCreditBalance, setStoreCreditBalance] = useState(0);
  const [applyCredit, setApplyCredit] = useState(false);
  const [storeCreditUsed, setStoreCreditUsed] = useState(0);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [redeemingGiftCard, setRedeemingGiftCard] = useState(false);
  const [giftCardMessage, setGiftCardMessage] = useState({ type: '', text: '' });

  // ========== Compute total weight of cart ==========
  useEffect(() => {
    const weight = cart.reduce((sum, item) => {
      const itemWeight = item.weight || 1;
      return sum + (itemWeight * item.quantity);
    }, 0);
    setTotalWeight(weight);
  }, [cart]);

  // ========== Tax estimate (dynamic) ==========
  const fetchTaxEstimate = useCallback(async () => {
    if (checkoutStep !== 'address') return;
    if (!shippingAddress.country || !shippingAddress.zipCode) return;
    setTaxLoading(true);
    try {
      const discountFactor = discountPercent ? (1 - discountPercent / 100) : 1;
      const itemsForTax = cart.map(item => ({
        unit_price: (item.priceAtAdd || item.price) * discountFactor,
        quantity: item.quantity,
        tax_code: item.taxCode || null,
      }));
      const res = await API.post('/tax/estimate', {
        shippingAddress,
        items: itemsForTax,
        shippingCost: displayShipping,
      });
      setTaxAmount(res.data.taxAmount);
      setTaxRate(res.data.taxRate);
    } catch (err) {
      console.error('Tax estimate failed:', err);
    } finally {
      setTaxLoading(false);
    }
  }, [checkoutStep, shippingAddress, cart, displayShipping, discountPercent]);

  useEffect(() => {
    if (checkoutStep === 'address' && shippingAddress.country && shippingAddress.zipCode) {
      fetchTaxEstimate();
    }
  }, [fetchTaxEstimate, checkoutStep, shippingAddress.country, shippingAddress.zipCode, cart, displayShipping, discountPercent]);

  // ========== Shipping methods & delivery dates ==========
  const fetchShippingMethods = useCallback(async () => {
    if (!shippingAddress.country || shippingAddress.country === 'Digital') return;
    setShippingLoading(true);
    try {
      const res = await API.post('/shipping/methods', {
        country: shippingAddress.country,
        weight: totalWeight,
        destination: {
          country: shippingAddress.country,
          state: shippingAddress.state,
          city: shippingAddress.city,
          zipCode: shippingAddress.zipCode,
        },
      });
      const methods = res.data.methods;
      setShippingMethods(methods);
      if (methods.length > 0 && !selectedShippingMethodId) {
        setSelectedShippingMethodId(methods[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch shipping methods:', err);
      setShippingMethods([]);
    } finally {
      setShippingLoading(false);
    }
  }, [shippingAddress.country, shippingAddress.state, shippingAddress.city, shippingAddress.zipCode, totalWeight]);

  const fetchDeliveryDates = useCallback(async () => {
    try {
      const res = await API.get('/shipping/delivery-dates');
      setAvailableDeliveryDates(res.data.dates);
      if (res.data.dates.length > 0 && !selectedDeliveryDate) {
        setSelectedDeliveryDate(res.data.dates[0]);
      }
    } catch (err) {
      console.error('Failed to fetch delivery dates:', err);
      setAvailableDeliveryDates([]);
    }
  }, []);

  useEffect(() => {
    if (checkoutStep === 'address' && shippingAddress.country && shippingAddress.country !== 'Digital') {
      fetchShippingMethods();
      fetchDeliveryDates();
    }
  }, [checkoutStep, shippingAddress.country, fetchShippingMethods, fetchDeliveryDates]);

  // Load saved address from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('shippingAddress');
    if (saved) setShippingAddress(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (shippingAddress.street) localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
  }, [shippingAddress]);

  // Fetch subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      setSubscriptionLoading(true);
      try {
        const res = await API.get('/buyer-subscription/current');
        setSubscription(res.data.subscription);
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
        setSubscription(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    fetchSubscription();
  }, [user]);

  // Fetch store credit on address step
  useEffect(() => {
    const fetchCreditBalance = async () => {
      if (!user) return;
      try {
        const res = await API.get('/gift-cards/balance');
        setStoreCreditBalance(res.data.storeCredit);
      } catch (err) {
        console.error('Failed to fetch store credit:', err);
      }
    };
    if (checkoutStep === 'address') {
      fetchCreditBalance();
    }
  }, [checkoutStep, user]);

  // Store credit usage
  useEffect(() => {
    const totalWithTax = displaySubtotal + displayShipping + taxAmount;
    if (applyCredit && storeCreditBalance > 0) {
      setStoreCreditUsed(Math.min(storeCreditBalance, totalWithTax));
    } else {
      setStoreCreditUsed(0);
    }
  }, [applyCredit, storeCreditBalance, displaySubtotal, displayShipping, taxAmount]);

  const totalWithTax = displaySubtotal + displayShipping + taxAmount;
  const effectiveTotal = Math.max(0, totalWithTax - storeCreditUsed);

  // ========== Step 1: Proceed to address ==========
  const proceedToAddress = () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }
    if (!user) {
      alert('Please login to checkout');
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    ReactGA.event({
      category: 'Ecommerce',
      action: 'begin_checkout',
      label: `Cart items: ${cart.length}`,
      value: displaySubtotal + displayShipping,
    });
    setCheckoutStep('address');
  };

  // Redeem gift card
  const handleRedeemGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    setRedeemingGiftCard(true);
    setGiftCardMessage({ type: '', text: '' });
    try {
      const res = await API.post('/gift-cards/redeem', { code: giftCardCode });
      setGiftCardMessage({ type: 'success', text: `Redeemed! New credit balance: $${res.data.newBalance}` });
      setGiftCardCode('');
      setStoreCreditBalance(res.data.newBalance);
      setApplyCredit(true);
    } catch (err) {
      setGiftCardMessage({ type: 'error', text: err.response?.data?.error || 'Redeem failed' });
    } finally {
      setRedeemingGiftCard(false);
    }
  };

  // Create order (checkout)
  const createOrderAndPay = async () => {
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
      alert('Please complete shipping address');
      return;
    }
    const hasPhysical = cart.some(item => !item.isDigital);
    if (hasPhysical && !freeShippingApplied && shippingMethods.length > 0 && !selectedShippingMethodId) {
      alert('Please select a shipping method');
      return;
    }
    setLoading(true);
    setPaymentError('');
    try {
      const items = cart.map(item => ({
        productId: item._id,
        quantity: item.quantity,
        selectedVariations: item.selectedVariations || {},
        isPreorder: item.isPreorder || false,
        estimatedShipDate: item.estimatedShipDate || null,
      }));
      const requestBody = {
        items,
        shippingAddress,
        paymentMethod,
        buyerNotes,
        storeCreditUsed: storeCreditUsed,
        shippingMethodId: (hasPhysical && !freeShippingApplied) ? selectedShippingMethodId : undefined,
        selectedDeliveryDate: selectedDeliveryDate || undefined,
      };
      const response = await checkout(requestBody);
      const { order: newOrder, paymentUrl, paymentInstructions } = response.data;
      setOrder(newOrder);

      if (paymentMethod === 'cash_on_delivery') {
        clearCart();
        await API.delete('/cart/clear');
        ReactGA.event({
          category: 'Ecommerce',
          action: 'purchase',
          label: newOrder.orderNumber,
          value: newOrder.total,
        });
        navigate(`/order/${newOrder._id}`);
      } else if (paymentUrl) {
        ReactGA.event({
          category: 'Ecommerce',
          action: 'add_payment_info',
          label: paymentMethod,
          value: effectiveTotal,
        });
        window.location.href = paymentUrl;
      } else {
        setPaymentError('No payment URL returned. Please contact support.');
        setCheckoutStep('payment');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.error || err.message || 'Checkout failed';
      alert(msg);
      setPaymentError(msg);
      setCheckoutStep('address');
    } finally {
      setLoading(false);
    }
  };

  const getMaxQuantity = (item) => {
    if (item.isPreorder && item.preorderStock > 0) return item.preorderStock;
    return item.stock > 0 ? item.stock : 9999;
  };

  // ========== RENDER CART ==========
  if (checkoutStep === 'cart') {
    return (
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>Shopping Cart</h1>
        {cart.length === 0 ? (
          <div style={styles.emptyCart}>
            <p>Your cart is empty.</p>
            <Link to="/">Continue Shopping</Link>
          </div>
        ) : (
          <>
            {subscription && subscription.isActive && (
              <div style={styles.subscriptionBanner}>
                🌟 Premium Member – You get {discountPercent > 0 ? `${discountPercent}% off` : ''}{discountPercent > 0 && freeShippingApplied ? ' & ' : ''}{freeShippingApplied ? 'Free Shipping' : ''} on this order!
              </div>
            )}
            <div style={styles.cartItems}>
              {cart.map(item => {
                const maxQty = getMaxQuantity(item);
                const isPreorder = item.isPreorder === true;
                return (
                  <div key={item.cartItemId} style={styles.cartItem}>
                    <img src={item.imageUrl || 'https://via.placeholder.com/80'} alt={item.name} style={styles.itemImage} />
                    <div style={styles.itemInfo}>
                      <div style={styles.itemTitleRow}>
                        <h4>{item.name}</h4>
                        {isPreorder && <span style={styles.preorderBadge}>🔮 Pre‑order</span>}
                      </div>
                      {renderVariations(item.selectedVariations)}
                      <p>${(item.priceAtAdd || item.price).toFixed(2)}</p>
                      {isPreorder && item.estimatedShipDate && (
                        <p style={styles.shipDate}>📅 Est. ship date: {new Date(item.estimatedShipDate).toLocaleDateString()}</p>
                      )}
                      {isPreorder && item.preorderMessage && (
                        <p style={styles.preorderMessage}>{item.preorderMessage}</p>
                      )}
                      <div style={styles.itemActions}>
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                        <span style={styles.quantity}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} disabled={item.quantity >= maxQty}>+</button>
                        <button onClick={() => removeFromCart(item.cartItemId)} style={styles.removeBtn}>Remove</button>
                      </div>
                      {maxQty > 0 && maxQty < 9999 && item.quantity >= maxQty && (
                        <div style={styles.limitWarning}>Maximum {maxQty} available for {isPreorder ? 'pre‑order' : 'stock'}</div>
                      )}
                    </div>
                    <div style={styles.itemTotal}>${((item.priceAtAdd || item.price) * item.quantity).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
            <div style={styles.summary}>
              <h3>Order Summary (estimated)</h3>
              {subscriptionDiscount > 0 && (
                <p style={{ color: '#28a745' }}>Subscription discount: -${subscriptionDiscount.toFixed(2)}</p>
              )}
              <p>Subtotal: ${displaySubtotal.toFixed(2)}</p>
              <p>Shipping: {displayShipping === 0 ? 'Free' : `$${displayShipping.toFixed(2)}`}</p>
              <p>Tax will be calculated at checkout based on your address.</p>
              <h4>Total before tax: ${(displaySubtotal + displayShipping).toFixed(2)}</h4>
              <button onClick={proceedToAddress} style={styles.checkoutBtn}>Proceed to Checkout</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ========== RENDER ADDRESS & PAYMENT ==========
  if (checkoutStep === 'address') {
    const hasPhysicalProducts = cart.some(item => !item.isDigital);
    return (
      <div style={styles.container}>
        <h2>Shipping Address</h2>
        <div style={styles.addressForm}>
          <input type="text" placeholder="Street" value={shippingAddress.street} onChange={e => setShippingAddress({...shippingAddress, street: e.target.value})} required />
          <input type="text" placeholder="City" value={shippingAddress.city} onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} required />
          <input type="text" placeholder="State" value={shippingAddress.state} onChange={e => setShippingAddress({...shippingAddress, state: e.target.value})} required />
          <input type="text" placeholder="Zip Code" value={shippingAddress.zipCode} onChange={e => setShippingAddress({...shippingAddress, zipCode: e.target.value})} required />
          <input type="text" placeholder="Country" value={shippingAddress.country} onChange={e => setShippingAddress({...shippingAddress, country: e.target.value})} />
          <textarea placeholder="Delivery instructions (optional)" value={shippingAddress.instructions} onChange={e => setShippingAddress({...shippingAddress, instructions: e.target.value})} rows="2" />

          {subscription && subscription.isActive && (
            <div style={styles.subscriptionNote}>
              ✨ Premium Member savings applied (discount & free shipping). Thank you for being a member!
            </div>
          )}

          {/* SHIPPING METHODS */}
          {hasPhysicalProducts && !freeShippingApplied && (
            <div style={styles.shippingSection}>
              <h4>Shipping Method</h4>
              {shippingLoading ? <LoadingSpinner size="small" /> : shippingMethods.length === 0 ? <p style={{ color: '#dc3545' }}>No shipping methods available for your location.</p> : (
                <div style={styles.shippingOptions}>
                  {shippingMethods.map(method => (
                    <label key={method.id} style={styles.shippingOption}>
                      <input type="radio" name="shippingMethod" value={method.id} checked={selectedShippingMethodId === method.id} onChange={() => setSelectedShippingMethodId(method.id)} />
                      <span><strong>{method.name}</strong> – ${method.price.toFixed(2)}{method.estimatedDays && <small> (delivery in {method.estimatedDays})</small>}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DELIVERY DATE */}
          {hasPhysicalProducts && availableDeliveryDates.length > 0 && (
            <div style={styles.deliverySection}>
              <h4>Choose Delivery Date</h4>
              <select value={selectedDeliveryDate} onChange={e => setSelectedDeliveryDate(e.target.value)} style={styles.deliverySelect}>
                {availableDeliveryDates.map(date => <option key={date} value={date}>{new Date(date).toLocaleDateString()}</option>)}
              </select>
              <small>Estimated delivery – subject to carrier availability</small>
            </div>
          )}

          {/* STORE CREDIT & GIFT CARD */}
          <div style={styles.creditSection}>
            <div style={styles.creditBalance}>💰 Store Credit Balance: <strong>${storeCreditBalance.toFixed(2)}</strong></div>
            {storeCreditBalance > 0 && (
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={applyCredit} onChange={(e) => setApplyCredit(e.target.checked)} />
                Apply store credit (up to ${Math.min(storeCreditBalance, totalWithTax).toFixed(2)})
              </label>
            )}
            {applyCredit && storeCreditUsed > 0 && (
              <div style={styles.appliedCredit}>
                Credit applied: <strong>${storeCreditUsed.toFixed(2)}</strong>
                <button onClick={() => setApplyCredit(false)} style={styles.removeCreditBtn}>Remove</button>
              </div>
            )}
            <div style={styles.giftCardSection}>
              <h4>Have a gift card?</h4>
              <div style={styles.giftCardInputGroup}>
                <input type="text" placeholder="Enter gift card code (XXXX-XXXX-XXXX-XXXX)" value={giftCardCode} onChange={e => setGiftCardCode(e.target.value.toUpperCase())} style={styles.giftCardInput} />
                <button onClick={handleRedeemGiftCard} disabled={redeemingGiftCard || !giftCardCode.trim()} style={styles.redeemBtn}>{redeemingGiftCard ? 'Redeeming...' : 'Redeem'}</button>
              </div>
              {giftCardMessage.text && <p style={{ color: giftCardMessage.type === 'success' ? '#28a745' : '#dc3545', fontSize: 13, marginTop: 5 }}>{giftCardMessage.text}</p>}
            </div>
          </div>

          <div>
            <label>Payment Method:</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="stripe">Credit Card (Stripe)</option>
              <option value="paypal">PayPal</option>
              <option value="paystack">Paystack</option>
              <option value="coinbase">Cryptocurrency (Coinbase)</option>
              <option value="cash_on_delivery">Cash on Delivery</option>
            </select>
          </div>
          <textarea placeholder="Order notes (optional)" value={buyerNotes} onChange={e => setBuyerNotes(e.target.value)} rows="2" />

          <div style={styles.orderTotals}>
            <p>Subtotal: ${displaySubtotal.toFixed(2)}</p>
            <p>Shipping: {displayShipping === 0 ? 'Free' : `$${displayShipping.toFixed(2)}`}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p>Tax:</p>
              {taxLoading ? <LoadingSpinner size="small" /> : <strong>${taxAmount.toFixed(2)}</strong>}
              {taxRate > 0 && <small>({taxRate.toFixed(2)}%)</small>}
            </div>
            {subscriptionDiscount > 0 && <p style={{ color: '#28a745' }}>Member discount: -${subscriptionDiscount.toFixed(2)}</p>}
            {storeCreditUsed > 0 && <p style={{ color: '#28a745' }}>Store Credit: -${storeCreditUsed.toFixed(2)}</p>}
            <h3 style={styles.finalTotal}>Total: ${effectiveTotal.toFixed(2)}</h3>
          </div>

          <div style={styles.buttonGroup}>
            <button onClick={() => setCheckoutStep('cart')}>Back to Cart</button>
            <button onClick={createOrderAndPay} disabled={loading} style={styles.primaryBtn}>{loading ? 'Processing...' : 'Place Order & Pay'}</button>
          </div>
          {paymentError && <div style={styles.errorMsg}>{paymentError}</div>}
        </div>
      </div>
    );
  }

  return <LoadingSpinner />;
};

// ========== STYLES (unchanged) ==========
const styles = {
  container: { maxWidth: 1000, margin: '0 auto', padding: 20 },
  pageTitle: { fontSize: 28, marginBottom: 20 },
  emptyCart: { textAlign: 'center', padding: 40 },
  cartItems: { marginBottom: 20 },
  cartItem: { display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #ddd', padding: '12px 0', flexWrap: 'wrap' },
  itemImage: { width: 80, height: 80, objectFit: 'cover' },
  itemInfo: { flex: 2, minWidth: 180 },
  itemTitleRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  variationDetails: { display: 'flex', gap: 6, marginTop: 4, marginBottom: 6, flexWrap: 'wrap' },
  variationBadge: { backgroundColor: '#e9ecef', padding: '2px 8px', borderRadius: 20, fontSize: 12, color: '#495057' },
  preorderBadge: { backgroundColor: '#6c757d', color: 'white', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' },
  shipDate: { fontSize: 12, color: '#6c757d', margin: '4px 0' },
  preorderMessage: { fontSize: 12, color: '#495057', margin: '2px 0' },
  itemActions: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 },
  quantity: { minWidth: 30, textAlign: 'center' },
  removeBtn: { background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' },
  limitWarning: { fontSize: 11, color: '#dc3545', marginTop: 4 },
  itemTotal: { fontWeight: 'bold', minWidth: 80, textAlign: 'right' },
  summary: { backgroundColor: '#f8f9fa', padding: 20, borderRadius: 8 },
  checkoutBtn: { background: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 10 },
  addressForm: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 },
  buttonGroup: { display: 'flex', gap: 12, marginTop: 16 },
  primaryBtn: { background: '#007bff', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer' },
  errorMsg: { color: '#dc3545', marginTop: 12, fontSize: 14 },
  creditSection: { backgroundColor: '#f0f8ff', padding: 15, borderRadius: 8, margin: '10px 0' },
  creditBalance: { fontSize: 16, fontWeight: 500, marginBottom: 10 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 10, cursor: 'pointer' },
  appliedCredit: { backgroundColor: '#d4edda', padding: 8, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  removeCreditBtn: { background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 },
  giftCardSection: { borderTop: '1px solid #ddd', paddingTop: 12, marginTop: 8 },
  giftCardInputGroup: { display: 'flex', gap: 10, marginTop: 8 },
  giftCardInput: { flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 4 },
  redeemBtn: { background: '#6c757d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' },
  orderTotals: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 6, marginTop: 8 },
  finalTotal: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  subscriptionBanner: { backgroundColor: '#e8f4ff', padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center', fontWeight: 'bold', color: '#007bff' },
  subscriptionNote: { backgroundColor: '#e8f4ff', padding: 8, borderRadius: 6, margin: '8px 0', fontSize: 13, textAlign: 'center' },
  shippingSection: { marginTop: 16, marginBottom: 16, padding: '10px', backgroundColor: '#f8f9fa', borderRadius: 6 },
  shippingOptions: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 },
  shippingOption: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  deliverySection: { marginBottom: 16 },
  deliverySelect: { width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, marginTop: 4 },
};

export default Cart;