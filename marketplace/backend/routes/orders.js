const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');
const Affiliate = require('../models/Affiliate');
const AffiliateClick = require('../models/AffiliateClick');
const AffiliateCoupon = require('../models/AffiliateCoupon'); // ✅ affiliate coupon model
const Activity = require('../models/Activity');
const ShippingRate = require('../models/ShippingRate');        // Advanced shipping
const auth = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { orderConfirmationHtml, shippingUpdateHtml } = require('../utils/emailTemplates');
const {
  createStripePayment,
  createPayPalPayment,
  createPaystackPayment,
  createCoinbasePayment,
} = require('../services/paymentService');
const { invalidateRecommendations } = require('./recommendations');
const { analyzeOrder, createFraudAlert } = require('../services/fraudDetection');
const { notifyUser } = require('../services/notificationService');
const { getUserActiveSubscription } = require('../services/subscriptionService');
const { dispatchEvent } = require('../services/webhookService');
const {
  getShippingMethods,
  getAvailableDeliveryDates,
} = require('../services/shippingService');   // Advanced shipping logic
const { calculateTaxForOrder } = require('../services/taxService'); // Tax automation

// Helper: Get seller's shipping origin (from shop settings or default)
const getSellerOrigin = async (sellerId) => {
  return {
    country: process.env.DEFAULT_SHIPPING_COUNTRY || 'US',
    state: process.env.DEFAULT_SHIPPING_STATE || 'CA',
    city: process.env.DEFAULT_SHIPPING_CITY || 'Los Angeles',
    zipCode: process.env.DEFAULT_SHIPPING_ZIP || '90001',
  };
};

// Helper: get client IP address
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
};

// ========== BUYER ROUTES ==========

/**
 * @route   POST /api/orders/checkout
 * @desc    Create a new order and generate payment URL (live gateways) or handle COD/store credit
 *          Applies buyer subscription perks, advanced shipping rules, delivery date selection,
 *          dynamic tax, and AFFILIATE COUPON / TIERED COMMISSIONS.
 * @access  Private (Buyer)
 */
router.post('/checkout', auth, async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      buyerNotes,
      storeCreditUsed = 0,
      shippingMethodId,
      selectedDeliveryDate,
      couponCode, // ✅ optional affiliate coupon code
    } = req.body;

    // ========== VALIDATION ==========
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ success: false, error: 'Payment method required' });
    }

    // ========== FETCH BUYER & PLATFORM SETTINGS ==========
    const buyer = await User.findById(req.user.id);
    if (!buyer) return res.status(404).json({ success: false, error: 'User not found' });
    const settings = await PlatformSettings.getSettings();

    // ========== SUBSCRIPTION PERKS ==========
    const activeSubscription = await getUserActiveSubscription(req.user.id);
    let subscriptionDiscountPercent = 0;
    let subscriptionFreeShipping = false;
    let subscriptionId = null;
    if (activeSubscription && activeSubscription.planId) {
      subscriptionDiscountPercent = activeSubscription.planId.perks?.discountPercent || 0;
      subscriptionFreeShipping = activeSubscription.planId.perks?.freeShipping || false;
      subscriptionId = activeSubscription._id;
    }

    // ========== PROCESS CART ITEMS ==========
    const orderItems = [];
    let subtotalRaw = 0;
    let hasPhysicalProduct = false;
    let hasDigitalProduct = false;
    let sellersMap = new Map();
    let totalWeightKg = 0;
    const lineItemsForTax = [];

    for (const cartItem of items) {
      const product = await Product.findById(cartItem.productId);
      if (!product) return res.status(404).json({ success: false, error: `Product ${cartItem.productId} not found` });
      if (!product.isActive) return res.status(400).json({ success: false, error: `${product.name} is no longer available` });

      const isDigital = product.isDigital === true;
      if (isDigital) hasDigitalProduct = true;
      else hasPhysicalProduct = true;

      let finalPrice = product.price;
      let selectedVariations = cartItem.selectedVariations || {};

      // Variation handling
      if (product.hasVariations && Object.keys(selectedVariations).length > 0) {
        const variationType = Object.keys(selectedVariations)[0];
        const selectedValue = selectedVariations[variationType];
        const variation = product.variations.find(v => v.type === variationType);
        const option = variation?.options.find(opt => opt.value === selectedValue);
        if (!option) return res.status(400).json({ success: false, error: `Invalid variation for ${product.name}` });
        finalPrice = product.price + (option.priceAdjustment || 0);
        if (!isDigital && option.stock < cartItem.quantity) {
          return res.status(400).json({ success: false, error: `${product.name} (${selectedValue}) only has ${option.stock} in stock` });
        }
      } else {
        if (!isDigital && product.stock < cartItem.quantity) {
          return res.status(400).json({ success: false, error: `${product.name} only has ${product.stock} in stock` });
        }
      }

      const itemTotal = finalPrice * cartItem.quantity;
      subtotalRaw += itemTotal;
      totalWeightKg += (product.weight || 1) * cartItem.quantity;

      orderItems.push({
        productId: product._id,
        sellerId: product.sellerId,
        name: product.name,
        price: finalPrice,
        quantity: cartItem.quantity,
        imageUrl: product.primaryImage || product.imageUrl,
        sku: product.sku,
        selectedVariations,
        isDigital,
        maxDownloads: product.maxDownloads,
        taxCode: product.taxCode || null,
      });

      lineItemsForTax.push({
        unit_price: finalPrice,
        quantity: cartItem.quantity,
        tax_code: product.taxCode || null,
      });

      sellersMap.set(product.sellerId.toString(), product.sellerId);
    }

    // ========== SHIPPING ADDRESS VALIDATION ==========
    if (hasPhysicalProduct) {
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
        return res.status(400).json({ success: false, error: 'Complete shipping address required for physical items' });
      }
    } else {
      if (!shippingAddress) {
        shippingAddress = buyer.address || { street: 'Digital Only', city: 'N/A', state: 'N/A', zipCode: '00000', country: 'Digital' };
      }
    }

    // ========== APPLY SUBSCRIPTION DISCOUNT ==========
    let subtotalAfterDiscount = subtotalRaw;
    let subscriptionDiscountAmount = 0;
    if (subscriptionDiscountPercent > 0) {
      subscriptionDiscountAmount = subtotalRaw * (subscriptionDiscountPercent / 100);
      subtotalAfterDiscount = subtotalRaw - subscriptionDiscountAmount;
    }

    // ========== AFFILIATE COUPON HANDLING ==========
    let appliedCoupon = null;
    let affiliateAttribution = null;
    let couponDiscount = 0;

    if (couponCode) {
      const coupon = await AffiliateCoupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date()) && (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)) {
        if (subtotalAfterDiscount >= (coupon.minOrderAmount || 0)) {
          appliedCoupon = coupon;
          if (coupon.discountType === 'percentage') {
            couponDiscount = subtotalAfterDiscount * (coupon.discountValue / 100);
          } else {
            couponDiscount = coupon.discountValue;
          }
          couponDiscount = Math.min(couponDiscount, subtotalAfterDiscount);
          subtotalAfterDiscount -= couponDiscount;

          if (coupon.affiliateId) {
            const affiliate = await Affiliate.findById(coupon.affiliateId);
            if (affiliate && affiliate.isActive) {
              affiliateAttribution = affiliate;
            }
          }
        } else {
          return res.status(400).json({ success: false, error: `Coupon requires minimum order amount of $${coupon.minOrderAmount}` });
        }
      } else {
        return res.status(400).json({ success: false, error: 'Invalid or expired coupon code' });
      }
    }

    // ========== ADVANCED SHIPPING ==========
    let shippingCost = 0;
    let shippingMethodName = null;
    let shippingMethodDbId = null;
    let selectedShippingRate = null;

    if (hasPhysicalProduct && !subscriptionFreeShipping) {
      const sellerId = orderItems[0].sellerId;
      const origin = await getSellerOrigin(sellerId);
      const destination = {
        country: shippingAddress.country,
        state: shippingAddress.state,
        city: shippingAddress.city,
        zipCode: shippingAddress.zipCode,
      };

      const availableMethods = await getShippingMethods(
        shippingAddress.country,
        totalWeightKg,
        origin,
        destination
      );

      if (availableMethods.length === 0) {
        return res.status(400).json({ success: false, error: 'No shipping methods available for your location' });
      }

      if (shippingMethodId) {
        selectedShippingRate = availableMethods.find(m => m.id === shippingMethodId);
        if (!selectedShippingRate) return res.status(400).json({ success: false, error: 'Invalid shipping method selected' });
      } else {
        selectedShippingRate = availableMethods[0];
      }

      shippingCost = selectedShippingRate.price;
      shippingMethodName = selectedShippingRate.name;
      shippingMethodDbId = selectedShippingRate.id;
    } else if (subscriptionFreeShipping) {
      shippingCost = 0;
      shippingMethodName = 'Free Shipping (Premium Member)';
    }

    // ========== DELIVERY DATE ==========
    let deliveryDateObj = null;
    if (selectedDeliveryDate && hasPhysicalProduct) {
      const availableDates = await getAvailableDeliveryDates(1);
      if (availableDates.includes(selectedDeliveryDate)) {
        deliveryDateObj = new Date(selectedDeliveryDate);
      } else {
        return res.status(400).json({ success: false, error: 'Selected delivery date is not available' });
      }
    }

    // ========== DYNAMIC TAX ==========
    const taxResult = await calculateTaxForOrder(
      settings,
      shippingAddress,
      lineItemsForTax,
      shippingCost
    );
    const taxAmount = taxResult.taxAmount;
    const taxRate = taxResult.taxRate;
    const taxBreakdown = taxResult.breakdown;

    let total = subtotalAfterDiscount + shippingCost + taxAmount;

    // ========== SELLER COMMISSION RATE ==========
    let effectiveCommission = settings.commissionRate;
    if (orderItems.length > 0) {
      const sellerId = orderItems[0].sellerId;
      const seller = await User.findById(sellerId);
      if (seller && settings.enableCommission && seller.hasActiveSubscription && await seller.hasActiveSubscription()) {
        const plan = settings.subscriptionPlans.id(seller.subscription.planId);
        if (plan) effectiveCommission = plan.commissionRate;
      }
    }

    // ========== COD MONETIZATION ==========
    let codFee = 0;
    let codHandlingFee = 0;
    if (paymentMethod === 'cash_on_delivery') {
      if (settings.enableCodFee) {
        if (settings.codFeeType === 'flat') {
          codFee = settings.codFeeFlat;
        } else {
          codFee = (total * settings.codFeePercent) / 100;
        }
      }
      if (settings.enableCodHandlingFee) {
        codHandlingFee = settings.codHandlingFeeAmount;
        shippingCost += codHandlingFee;
      }
      if (settings.enableCodCommission) {
        effectiveCommission = settings.codCommissionRate;
      }
      total += codFee;
    }

    // ========== STORE CREDIT ==========
    let appliedCredit = 0;
    if (storeCreditUsed > 0) {
      if (storeCreditUsed > buyer.storeCredit) {
        return res.status(400).json({ success: false, error: 'Insufficient store credit balance' });
      }
      appliedCredit = Math.min(storeCreditUsed, total);
      await buyer.useStoreCredit(appliedCredit, `Applied to order #${orderNumber || 'new order'}`, null);
    }
    const totalAfterCredit = Math.max(0, total - appliedCredit);

    // ========== AFFILIATE TRACKING (cookie fallback) ==========
    if (!affiliateAttribution) {
      const affiliateCode = req.cookies?.affiliate_code;
      if (affiliateCode) {
        const affiliate = await Affiliate.findOne({ affiliateCode, isActive: true });
        if (affiliate) {
          affiliateAttribution = affiliate;
          await AffiliateClick.findOneAndUpdate(
            { affiliateCode, converted: false },
            { converted: true, conversionOrderId: order._id },
            { sort: { createdAt: -1 } }
          );
        }
      }
    }

    // ========== AFFILIATE COMMISSION ==========
    let affiliateCommissionAmount = 0;
    let referredByCode = null;
    if (affiliateAttribution) {
      const baseForCommission = subtotalAfterDiscount; // commission on discounted product total
      const effectiveRate = await affiliateAttribution.getEffectiveCommissionRate();
      affiliateCommissionAmount = (baseForCommission * effectiveRate) / 100;
      await affiliateAttribution.addEarnings(baseForCommission, effectiveRate);
      referredByCode = affiliateAttribution.affiliateCode;
    }

    // ========== CREATE ORDER ==========
    const order = new Order({
      buyerId: req.user.id,
      buyerInfo: {
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone || '',
      },
      shippingAddress: shippingAddress || {},
      billingAddress: billingAddress || shippingAddress || {},
      items: orderItems,
      subtotal: subtotalRaw,
      shippingCost,
      tax: taxAmount,
      discount: subscriptionDiscountAmount + couponDiscount,
      total: total,
      amountPaid: totalAfterCredit,
      storeCreditUsed: appliedCredit,
      paymentMethod,
      paymentStatus: totalAfterCredit === 0 ? 'paid' : 'pending',
      status: totalAfterCredit === 0 ? 'processing' : 'pending',
      buyerNotes: buyerNotes || '',
      commission: {
        rate: effectiveCommission,
        amount: 0,
      },
      transactionFee: 0,
      sellerEarnings: 0,
      hasDigital: hasDigitalProduct,
      codFee: codFee,
      codHandlingFee: codHandlingFee,
      ipAddress: getClientIp(req),
      subscriptionDiscount: subscriptionDiscountAmount,
      subscriptionFreeShippingApplied: subscriptionFreeShipping,
      subscriptionId: subscriptionId,
      shippingMethodName,
      shippingMethodId: shippingMethodDbId,
      selectedDeliveryDate: deliveryDateObj,
      totalWeight: totalWeightKg,
      taxRate: taxRate,
      taxBreakdown: taxBreakdown,
      affiliateCommission: affiliateCommissionAmount,
      referredBy: referredByCode,
      appliedCouponId: appliedCoupon?._id,
    });

    await order.save();
    if (appliedCredit > 0) {
      const latestCreditEntry = buyer.storeCreditHistory.find(entry => entry.amount === -appliedCredit && !entry.orderId);
      if (latestCreditEntry) {
        latestCreditEntry.orderId = order._id;
        latestCreditEntry.description = `Applied to order #${order.orderNumber}`;
        await buyer.save();
      }
    }

    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }

    // ========== SOCIAL ACTIVITIES ==========
    for (const item of orderItems) {
      await Activity.create({
        userId: order.buyerId,
        type: 'purchase',
        referenceId: item.productId,
        referenceModel: 'Product',
        metadata: {
          productName: item.name,
          quantity: item.quantity,
          sellerId: item.sellerId,
          orderId: order._id,
        },
        isPublic: true,
      });
    }

    // ========== WEBHOOK: order.created ==========
    await dispatchEvent('order.created', {
      event: 'order.created',
      timestamp: new Date().toISOString(),
      orderId: order._id,
      orderNumber: order.orderNumber,
      buyerId: order.buyerId,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      items: order.items.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
    });

    // ========== FRAUD DETECTION ==========
    if (settings.enableFraudDetection) {
      const { riskScore, riskLevel, reasons } = await analyzeOrder(order, req);
      const alert = await createFraudAlert(order, riskScore, riskLevel, reasons);
      if (riskLevel === 'critical' || riskLevel === 'high') {
        console.warn(`[FRAUD ALERT] Order ${order.orderNumber} risk score ${riskScore} - ${riskLevel}`);
      }
    }

    // ========== STOCK DEDUCTION ==========
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      if (item.isDigital) {
        product.soldCount += item.quantity;
        await product.save();
      } else {
        await product.reduceStock(item.quantity, item.selectedVariations);
      }
    }

    // ========== CONFIRMATION EMAIL ==========
    try {
      await sendEmail({
        to: buyer.email,
        subject: `Order Confirmation #${order.orderNumber}`,
        html: orderConfirmationHtml(order, buyer),
      });
    } catch (emailErr) {
      console.error('Failed to send order confirmation email:', emailErr.message);
    }

    // ========== PAYMENT HANDLING ==========
    const successUrl = `${process.env.CLIENT_URL}/order/${order._id}`;
    const cancelUrl = `${process.env.CLIENT_URL}/cart`;

    if (totalAfterCredit === 0) {
      // Zero total after credit – mark order as paid directly
      let commissionAmount = 0;
      let transactionFeeAmount = 0;
      let sellerEarnings = order.total;
      if (settings.enableCommission) {
        commissionAmount = (order.total * effectiveCommission) / 100;
        sellerEarnings = order.total - commissionAmount;
      }
      if (settings.enableTransactionFee) {
        transactionFeeAmount = (order.total * settings.transactionFeePercent) / 100;
        sellerEarnings -= transactionFeeAmount;
      }
      order.commission.amount = commissionAmount;
      order.transactionFee = transactionFeeAmount;
      order.sellerEarnings = sellerEarnings;
      order.paymentStatus = 'paid';
      order.status = 'processing';
      order.paidAt = new Date();
      await order.save();

      for (const item of orderItems) {
        const seller = await User.findById(item.sellerId);
        if (seller) {
          const itemTotal = item.price * item.quantity;
          const itemCommission = (itemTotal * effectiveCommission) / 100;
          const itemEarnings = itemTotal - itemCommission;
          await seller.addEarnings(itemEarnings);
        }
      }

      await dispatchEvent('order.paid', {
        event: 'order.paid',
        timestamp: new Date().toISOString(),
        orderId: order._id,
        orderNumber: order.orderNumber,
        paidAt: order.paidAt,
        paymentMethod: order.paymentMethod,
        total: order.total,
        amountPaid: totalAfterCredit,
      });

      await invalidateRecommendations(order.buyerId);
      await notifyUser(
        order.buyerId,
        'order_update',
        `Order #${order.orderNumber} created`,
        `Your order has been placed and paid using store credit.`,
        `/order/${order._id}`
      );

      return res.status(201).json({
        success: true,
        order,
        paymentInstructions: 'Paid using store credit. No further action needed.',
      });
    }

    const allowedGateways = settings.enabledPaymentGateways || {};

    if (paymentMethod === 'cash_on_delivery') {
      await invalidateRecommendations(order.buyerId);
      await notifyUser(
        order.buyerId,
        'order_update',
        `Order #${order.orderNumber} created`,
        `Your order has been placed and will be processed soon. ${codFee > 0 ? `COD fee: $${codFee.toFixed(2)} included.` : ''}`,
        `/order/${order._id}`
      );
      return res.status(201).json({
        success: true,
        order,
        paymentInstructions: `Pay when your order arrives. ${codFee > 0 ? `COD fee: $${codFee.toFixed(2)} included.` : ''}`,
      });
    }

    let paymentResult = null;
    switch (paymentMethod) {
      case 'stripe':
        if (!allowedGateways.stripe) return res.status(400).json({ success: false, error: 'Stripe payments not enabled' });
        paymentResult = await createStripePayment(order, successUrl, cancelUrl, totalAfterCredit);
        break;
      case 'paypal':
        if (!allowedGateways.paypal) return res.status(400).json({ success: false, error: 'PayPal payments not enabled' });
        paymentResult = await createPayPalPayment(order, successUrl, cancelUrl, totalAfterCredit);
        break;
      case 'paystack':
        if (!allowedGateways.paystack) return res.status(400).json({ success: false, error: 'Paystack payments not enabled' });
        paymentResult = await createPaystackPayment(order, successUrl, cancelUrl, totalAfterCredit);
        break;
      case 'coinbase':
        if (!allowedGateways.coinbase) return res.status(400).json({ success: false, error: 'Coinbase payments not enabled' });
        paymentResult = await createCoinbasePayment(order, successUrl, cancelUrl, totalAfterCredit);
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid payment method' });
    }

    order.paymentGateway = paymentMethod;
    order.paymentGatewayReference = paymentResult.paymentId;
    await order.save();

    await invalidateRecommendations(order.buyerId);

    res.status(201).json({
      success: true,
      order,
      paymentUrl: paymentResult.url,
      paymentInstructions: 'Complete payment using the link provided',
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error during checkout' });
  }
});

/**
 * @route   POST /api/orders/:id/pay
 * @desc    (Legacy) Simulate payment – kept for backward compatibility
 * @access  Private (Buyer)
 */
router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { paymentId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'Unauthorized' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ success: false, error: 'Order already paid' });
    if (order.status === 'cancelled') return res.status(400).json({ success: false, error: 'Cancelled orders cannot be paid' });

    const settings = await PlatformSettings.getSettings();

    let commissionAmount = 0;
    let transactionFeeAmount = 0;
    let sellerEarnings = order.total;

    if (settings.enableCommission) {
      commissionAmount = (order.total * order.commission.rate) / 100;
      sellerEarnings = order.total - commissionAmount;
    }
    if (settings.enableTransactionFee) {
      transactionFeeAmount = (order.total * settings.transactionFeePercent) / 100;
      sellerEarnings -= transactionFeeAmount;
    }

    order.commission.amount = commissionAmount;
    order.transactionFee = transactionFeeAmount;
    order.sellerEarnings = sellerEarnings;
    await order.markAsPaid(paymentId || `SIM_${Date.now()}`);
    order.status = 'processing';
    await order.save();

    if (order.items.length > 0) {
      const sellerId = order.items[0].sellerId;
      const seller = await User.findById(sellerId);
      if (seller) await seller.addEarnings(sellerEarnings);
    }

    await dispatchEvent('order.paid', {
      event: 'order.paid',
      timestamp: new Date().toISOString(),
      orderId: order._id,
      orderNumber: order.orderNumber,
      paidAt: order.paidAt,
      paymentMethod: order.paymentMethod,
      total: order.total,
    });

    await invalidateRecommendations(order.buyerId);
    await notifyUser(
      order.buyerId,
      'order_update',
      `Payment confirmed for order #${order.orderNumber}`,
      `Your payment has been received. We'll process your order soon.`,
      `/order/${order._id}`
    );

    res.json({ success: true, order, message: 'Payment successful' });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, error: 'Server error processing payment' });
  }
});

/**
 * @route   GET /api/orders
 * @desc    Get logged-in buyer's orders
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { buyerId: req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);
    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ success: false, error: 'Server error fetching orders' });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private (buyer or seller of items in order)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('buyerId', 'name email phone');
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const isBuyer = order.buyerId._id.toString() === req.user.id;
    const isSeller = order.items.some(item => item.sellerId.toString() === req.user.id);
    if (!isBuyer && !isSeller) return res.status(403).json({ success: false, error: 'Unauthorized' });

    res.json({ success: true, order });
  } catch (err) {
    console.error('Get order error:', err);
    if (err.kind === 'ObjectId') return res.status(404).json({ success: false, error: 'Order not found' });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel order (buyer only, before shipping)
 * @access  Private (Buyer)
 */
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'Unauthorized' });
    if (!order.canCancel()) return res.status(400).json({ success: false, error: `Cannot cancel order with status: ${order.status}` });

    if (order.storeCreditUsed > 0) {
      const buyer = await User.findById(order.buyerId);
      if (buyer) {
        await buyer.addStoreCredit(order.storeCreditUsed, 'refund', `Refund for cancelled order #${order.orderNumber}`, null);
      }
    }

    await order.cancel(reason || 'Cancelled by buyer');

    await dispatchEvent('order.cancelled', {
      event: 'order.cancelled',
      timestamp: new Date().toISOString(),
      orderId: order._id,
      orderNumber: order.orderNumber,
      cancelReason: reason,
      cancelledAt: order.cancelledAt,
    });

    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      if (item.isDigital) {
        product.soldCount -= item.quantity;
        await product.save();
      } else {
        await product.increaseStock(item.quantity, item.selectedVariations);
      }
    }

    if (order.paymentStatus === 'paid' && order.sellerEarnings > 0 && order.items.length > 0) {
      const seller = await User.findById(order.items[0].sellerId);
      if (seller) {
        seller.balance -= order.sellerEarnings;
        seller.totalEarned -= order.sellerEarnings;
        await seller.save();
      }
    }

    if (order.referredBy && order.affiliateCommission > 0 && order.paymentStatus === 'paid') {
      const affiliate = await Affiliate.findOne({ affiliateCode: order.referredBy });
      if (affiliate) {
        affiliate.pendingEarnings -= order.affiliateCommission;
        affiliate.totalEarnings -= order.affiliateCommission;
        await affiliate.save();
      }
    }

    if (order.paymentStatus === 'paid') {
      await invalidateRecommendations(order.buyerId);
    }

    await notifyUser(
      order.buyerId,
      'order_update',
      `Order #${order.orderNumber} cancelled`,
      `Your order has been cancelled. ${order.paymentStatus === 'paid' ? 'Refund will be processed.' : ''}`,
      `/order/${order._id}`
    );

    res.json({ success: true, order, message: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ success: false, error: 'Server error cancelling order' });
  }
});

// ========== SELLER ROUTES ==========

router.get('/seller/orders', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'seller') {
      return res.status(403).json({ success: false, error: 'Only sellers can access this endpoint' });
    }

    const filter = { 'items.sellerId': req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('buyerId', 'name email');

    const total = await Order.countDocuments(filter);

    const sanitizedOrders = orders.map(order => {
      const sellerItems = order.items.filter(item => item.sellerId.toString() === req.user.id);
      return {
        ...order.toObject(),
        items: sellerItems,
        sellerSubtotal: sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      };
    });

    res.json({ success: true, orders: sanitizedOrders, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get seller orders error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, trackingNumber, carrier } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const hasSellerItem = order.items.some(item => item.sellerId.toString() === req.user.id);
    if (!hasSellerItem) return res.status(403).json({ success: false, error: 'You do not have items in this order' });

    const allowedTransitions = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };
    if (!allowedTransitions[order.status].includes(status)) {
      return res.status(400).json({ success: false, error: `Cannot change status from ${order.status} to ${status}` });
    }

    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
      order.carrier = carrier || 'other';
    }
    await order.save();

    if (status === 'shipped') {
      await dispatchEvent('order.shipped', {
        event: 'order.shipped',
        timestamp: new Date().toISOString(),
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
      });
    } else if (status === 'delivered') {
      await dispatchEvent('order.delivered', {
        event: 'order.delivered',
        timestamp: new Date().toISOString(),
        orderId: order._id,
        orderNumber: order.orderNumber,
        deliveredAt: order.deliveredAt,
      });
    }

    if (status === 'shipped' && order.trackingNumber) {
      try {
        await sendEmail({
          to: order.buyerInfo.email,
          subject: `Your order #${order.orderNumber} has been shipped`,
          html: shippingUpdateHtml(order, order.trackingNumber),
        });
      } catch (emailErr) {
        console.error('Failed to send shipping email:', emailErr.message);
      }
    }

    let notificationTitle = `Order #${order.orderNumber} updated`;
    let notificationMessage = `Your order status is now ${status}.`;
    if (status === 'shipped' && trackingNumber) {
      notificationMessage += ` Tracking number: ${trackingNumber}`;
    }
    await notifyUser(
      order.buyerId,
      'order_update',
      notificationTitle,
      notificationMessage,
      `/order/${order._id}`
    );

    res.json({ success: true, order, message: `Order status updated to ${status}` });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/:id/tracking', auth, async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const hasSellerItem = order.items.some(item => item.sellerId.toString() === req.user.id);
    if (!hasSellerItem) return res.status(403).json({ success: false, error: 'Unauthorized' });

    await order.addTracking(trackingNumber, carrier);
    await notifyUser(
      order.buyerId,
      'order_update',
      `Tracking added for order #${order.orderNumber}`,
      `Tracking number: ${trackingNumber} (${carrier})`,
      `/order/${order._id}`
    );
    res.json({ success: true, order, message: 'Tracking information added' });
  } catch (err) {
    console.error('Add tracking error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ========== ADMIN ROUTES ==========

router.get('/admin/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin && user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit)).populate('buyerId', 'name email');
    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total/limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin && user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
    const { status, paymentStatus, trackingNumber, carrier } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;
    await order.save();
    await notifyUser(
      order.buyerId,
      'order_update',
      `Order #${order.orderNumber} updated by admin`,
      `Order status: ${order.status}`,
      `/order/${order._id}`
    );
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;