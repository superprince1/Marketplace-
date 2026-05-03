const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');
const Affiliate = require('../models/Affiliate');
const AffiliateClick = require('../models/AffiliateClick');
const Activity = require('../models/Activity');
const { getUserActiveSubscription } = require('../services/subscriptionService');
const { getShippingMethods, getAvailableDeliveryDates } = require('../services/shippingService');
const { calculateTaxForOrder } = require('../services/taxService');
const { dispatchEvent } = require('../services/webhookService');
const { invalidateRecommendations } = require('../routes/recommendations');
const { analyzeOrder, createFraudAlert } = require('../services/fraudDetection');
const { notifyUser } = require('../services/notificationService');
const sendEmail = require('../utils/sendEmail');
const { orderConfirmationHtml, shippingUpdateHtml } = require('../utils/emailTemplates');
const {
  createStripePayment,
  createPayPalPayment,
  createPaystackPayment,
  createCoinbasePayment,
} = require('../services/paymentService');

// Helper: get client IP
const getClientIp = (req) => req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

// Helper: get seller origin
const getSellerOrigin = async (sellerId) => ({
  country: process.env.DEFAULT_SHIPPING_COUNTRY || 'US',
  state: process.env.DEFAULT_SHIPPING_STATE || 'CA',
  city: process.env.DEFAULT_SHIPPING_CITY || 'Los Angeles',
  zipCode: process.env.DEFAULT_SHIPPING_ZIP || '90001',
});

/**
 * @desc    Create a new order (checkout)
 * @route   POST /api/orders/checkout
 * @access  Private
 */
exports.createOrder = async (req, res) => {
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
    } = req.body;

    const buyer = await User.findById(req.user.id);
    if (!buyer) return res.status(404).json({ success: false, error: 'User not found' });
    const settings = await PlatformSettings.getSettings();

    // Subscription perks
    const activeSubscription = await getUserActiveSubscription(req.user.id);
    let subscriptionDiscountPercent = 0;
    let subscriptionFreeShipping = false;
    let subscriptionId = null;
    if (activeSubscription?.planId) {
      subscriptionDiscountPercent = activeSubscription.planId.perks?.discountPercent || 0;
      subscriptionFreeShipping = activeSubscription.planId.perks?.freeShipping || false;
      subscriptionId = activeSubscription._id;
    }

    // Process items
    const orderItems = [];
    let subtotalRaw = 0;
    let hasPhysical = false;
    let hasDigital = false;
    let totalWeightKg = 0;
    const lineItemsForTax = [];

    for (const cartItem of items) {
      const product = await Product.findById(cartItem.productId);
      if (!product) return res.status(404).json({ success: false, error: `Product ${cartItem.productId} not found` });
      if (!product.isActive) return res.status(400).json({ success: false, error: `${product.name} unavailable` });

      const isDigital = product.isDigital;
      if (isDigital) hasDigital = true;
      else hasPhysical = true;

      let finalPrice = product.price;
      let selectedVariations = cartItem.selectedVariations || {};
      // Variation handling
      if (product.hasVariations && Object.keys(selectedVariations).length) {
        const variationType = Object.keys(selectedVariations)[0];
        const selectedValue = selectedVariations[variationType];
        const variation = product.variations.find(v => v.type === variationType);
        const option = variation?.options.find(o => o.value === selectedValue);
        if (!option) return res.status(400).json({ success: false, error: `Invalid variation for ${product.name}` });
        finalPrice = product.price + (option.priceAdjustment || 0);
        if (!isDigital && option.stock < cartItem.quantity) {
          return res.status(400).json({ success: false, error: `${product.name} (${selectedValue}) only ${option.stock} left` });
        }
      } else if (!isDigital && product.stock < cartItem.quantity) {
        return res.status(400).json({ success: false, error: `${product.name} only ${product.stock} left` });
      }

      subtotalRaw += finalPrice * cartItem.quantity;
      totalWeightKg += (product.weight || 1) * cartItem.quantity;
      orderItems.push({
        productId: product._id,
        sellerId: product.sellerId,
        name: product.name,
        price: finalPrice,
        quantity: cartItem.quantity,
        imageUrl: product.imageUrl,
        sku: product.sku,
        selectedVariations,
        isDigital,
        maxDownloads: product.maxDownloads,
        taxCode: product.taxCode,
      });
      lineItemsForTax.push({ unit_price: finalPrice, quantity: cartItem.quantity, tax_code: product.taxCode });
    }

    // Validate shipping address
    if (hasPhysical) {
      if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.zipCode) {
        return res.status(400).json({ success: false, error: 'Complete shipping address required' });
      }
    } else {
      if (!shippingAddress) shippingAddress = buyer.address || { street: 'Digital Only', city: 'N/A', state: 'N/A', zipCode: '00000', country: 'Digital' };
    }

    // Subscription discount
    let subtotalAfterDiscount = subtotalRaw;
    let subscriptionDiscountAmount = 0;
    if (subscriptionDiscountPercent > 0) {
      subscriptionDiscountAmount = subtotalRaw * (subscriptionDiscountPercent / 100);
      subtotalAfterDiscount = subtotalRaw - subscriptionDiscountAmount;
    }

    // Advanced shipping
    let shippingCost = 0, shippingMethodName = null, shippingMethodDbId = null;
    if (hasPhysical && !subscriptionFreeShipping) {
      const origin = await getSellerOrigin(orderItems[0].sellerId);
      const destination = { country: shippingAddress.country, state: shippingAddress.state, city: shippingAddress.city, zipCode: shippingAddress.zipCode };
      const methods = await getShippingMethods(shippingAddress.country, totalWeightKg, origin, destination);
      if (!methods.length) return res.status(400).json({ success: false, error: 'No shipping methods available' });
      const selected = methods.find(m => m.id === shippingMethodId) || methods[0];
      shippingCost = selected.price;
      shippingMethodName = selected.name;
      shippingMethodDbId = selected.id;
    } else if (subscriptionFreeShipping) {
      shippingCost = 0;
      shippingMethodName = 'Free Shipping (Premium)';
    }

    // Delivery date
    let deliveryDateObj = null;
    if (selectedDeliveryDate && hasPhysical) {
      const available = await getAvailableDeliveryDates(1);
      if (available.includes(selectedDeliveryDate)) deliveryDateObj = new Date(selectedDeliveryDate);
      else return res.status(400).json({ success: false, error: 'Selected delivery date unavailable' });
    }

    // Tax calculation
    const taxResult = await calculateTaxForOrder(settings, shippingAddress, lineItemsForTax, shippingCost);
    const taxAmount = taxResult.taxAmount;
    const taxRate = taxResult.taxRate;

    let total = subtotalAfterDiscount + shippingCost + taxAmount;

    // COD additional fees
    let codFee = 0, codHandlingFee = 0;
    if (paymentMethod === 'cash_on_delivery') {
      if (settings.enableCodFee) {
        codFee = settings.codFeeType === 'flat' ? settings.codFeeFlat : (total * settings.codFeePercent) / 100;
      }
      if (settings.enableCodHandlingFee) {
        codHandlingFee = settings.codHandlingFeeAmount;
        shippingCost += codHandlingFee;
        total += codHandlingFee;
      }
      total += codFee;
    }

    // Store credit
    let appliedCredit = 0;
    if (storeCreditUsed > 0) {
      if (storeCreditUsed > buyer.storeCredit) return res.status(400).json({ success: false, error: 'Insufficient store credit' });
      appliedCredit = Math.min(storeCreditUsed, total);
      await buyer.useStoreCredit(appliedCredit, `Applied to order #${orderNumber || 'new order'}`, null);
    }
    const totalAfterCredit = Math.max(0, total - appliedCredit);

    // Commission rate for seller (simplified: first seller)
    let effectiveCommission = settings.commissionRate;
    if (orderItems.length && orderItems[0].sellerId) {
      const seller = await User.findById(orderItems[0].sellerId);
      if (seller && settings.enableCommission && await seller.hasActiveSubscription()) {
        const plan = settings.subscriptionPlans.id(seller.subscription.planId);
        if (plan) effectiveCommission = plan.commissionRate;
      }
    }

    // Affiliate tracking (cookie fallback)
    let affiliateAttribution = null;
    const affiliateCode = req.cookies?.affiliate_code;
    if (affiliateCode) {
      const affiliate = await Affiliate.findOne({ affiliateCode, isActive: true });
      if (affiliate) affiliateAttribution = affiliate;
    }

    let affiliateCommissionAmount = 0, referredByCode = null;
    if (affiliateAttribution) {
      const baseForCommission = subtotalAfterDiscount;
      const effectiveRate = await affiliateAttribution.getEffectiveCommissionRate();
      affiliateCommissionAmount = (baseForCommission * effectiveRate) / 100;
      await affiliateAttribution.addEarnings(baseForCommission, effectiveRate);
      referredByCode = affiliateAttribution.affiliateCode;
      // Record click conversion
      await AffiliateClick.findOneAndUpdate(
        { affiliateCode, converted: false },
        { converted: true, conversionOrderId: order._id },
        { sort: { createdAt: -1 } }
      );
    }

    // Create order
    const order = new Order({
      buyerId: req.user.id,
      buyerInfo: { name: buyer.name, email: buyer.email, phone: buyer.phone || '' },
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      items: orderItems,
      subtotal: subtotalRaw,
      shippingCost,
      tax: taxAmount,
      discount: subscriptionDiscountAmount,
      total,
      amountPaid: totalAfterCredit,
      storeCreditUsed: appliedCredit,
      paymentMethod,
      paymentStatus: totalAfterCredit === 0 ? 'paid' : 'pending',
      status: totalAfterCredit === 0 ? 'processing' : 'pending',
      buyerNotes: buyerNotes || '',
      commission: { rate: effectiveCommission, amount: 0 },
      transactionFee: 0,
      sellerEarnings: 0,
      hasDigital: hasDigital,
      codFee,
      codHandlingFee,
      ipAddress: getClientIp(req),
      subscriptionDiscount: subscriptionDiscountAmount,
      subscriptionFreeShippingApplied: subscriptionFreeShipping,
      subscriptionId,
      shippingMethodName,
      shippingMethodId: shippingMethodDbId,
      selectedDeliveryDate: deliveryDateObj,
      totalWeight: totalWeightKg,
      taxRate,
      affiliateCommission: affiliateCommissionAmount,
      referredBy: referredByCode,
    });

    await order.save();
    if (appliedCredit > 0) {
      const entry = buyer.storeCreditHistory.find(e => e.amount === -appliedCredit && !e.orderId);
      if (entry) {
        entry.orderId = order._id;
        entry.description = `Applied to order #${order.orderNumber}`;
        await buyer.save();
      }
    }

    // Social activities
    for (const item of orderItems) {
      await Activity.create({
        userId: order.buyerId,
        type: 'purchase',
        referenceId: item.productId,
        referenceModel: 'Product',
        metadata: { productName: item.name, quantity: item.quantity, sellerId: item.sellerId, orderId: order._id },
        isPublic: true,
      });
    }

    // Webhook
    await dispatchEvent('order.created', { event: 'order.created', timestamp: new Date(), orderId: order._id, orderNumber: order.orderNumber, buyerId: order.buyerId, total: order.total, status: order.status, paymentStatus: order.paymentStatus, items: orderItems.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity, price: i.price })) });

    // Fraud detection
    if (settings.enableFraudDetection) {
      const { riskScore, riskLevel, reasons } = await analyzeOrder(order, req);
      if (riskLevel === 'high' || riskLevel === 'critical') console.warn(`[FRAUD] Order ${order.orderNumber} score ${riskScore}`);
    }

    // Stock deduction
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        if (item.isDigital) product.soldCount += item.quantity;
        else await product.reduceStock(item.quantity, item.selectedVariations);
        await product.save();
      }
    }

    // Email
    await sendEmail({ to: buyer.email, subject: `Order Confirmation #${order.orderNumber}`, html: orderConfirmationHtml(order, buyer) }).catch(console.error);

    // Payment handling
    const successUrl = `${process.env.CLIENT_URL}/order/${order._id}`;
    const cancelUrl = `${process.env.CLIENT_URL}/cart`;

    if (totalAfterCredit === 0) {
      // Zero total – mark as paid
      let commissionAmount = 0, transactionFeeAmount = 0, sellerEarnings = order.total;
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
          const itemComm = (itemTotal * effectiveCommission) / 100;
          await seller.addEarnings(itemTotal - itemComm);
        }
      }

      await dispatchEvent('order.paid', { event: 'order.paid', timestamp: new Date(), orderId: order._id, orderNumber: order.orderNumber, paidAt: order.paidAt, paymentMethod, total: order.total, amountPaid: totalAfterCredit });
      await invalidateRecommendations(order.buyerId);
      await notifyUser(order.buyerId, 'order_update', `Order #${order.orderNumber} created`, `Your order has been placed and paid using store credit.`, `/order/${order._id}`);
      return res.status(201).json({ success: true, order, paymentInstructions: 'Paid using store credit' });
    }

    // Gateways
    const allowed = settings.enabledPaymentGateways || {};
    if (paymentMethod === 'cash_on_delivery') {
      await invalidateRecommendations(order.buyerId);
      await notifyUser(order.buyerId, 'order_update', `Order #${order.orderNumber} created`, `Your order placed. COD fee: $${codFee}`, `/order/${order._id}`);
      return res.status(201).json({ success: true, order, paymentInstructions: `Pay on delivery. ${codFee ? `Fee $${codFee}` : ''}` });
    }

    let paymentResult;
    switch (paymentMethod) {
      case 'stripe':
        if (!allowed.stripe) return res.status(400).json({ success: false, error: 'Stripe not enabled' });
        paymentResult = await createStripePayment(order, successUrl, cancelUrl, totalAfterCredit);
        break;
      case 'paypal':
        if (!allowed.paypal) return res.status(400).json({ success: false, error: 'PayPal not enabled' });
        paymentResult = await createPayPalPayment(order, successUrl, cancelUrl, totalAfterCredit);
        break;
      case 'paystack':
        if (!allowed.paystack) return res.status(400).json({ success: false, error: 'Paystack not enabled' });
        paymentResult = await createPaystackPayment(order, successUrl, cancelUrl, totalAfterCredit);
        break;
      case 'coinbase':
        if (!allowed.coinbase) return res.status(400).json({ success: false, error: 'Coinbase not enabled' });
        paymentResult = await createCoinbasePayment(order, successUrl, cancelUrl, totalAfterCredit);
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid payment method' });
    }

    order.paymentGateway = paymentMethod;
    order.paymentGatewayReference = paymentResult.paymentId;
    await order.save();

    await invalidateRecommendations(order.buyerId);
    res.status(201).json({ success: true, order, paymentUrl: paymentResult.url, paymentInstructions: 'Complete payment using link' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message || 'Checkout error' });
  }
};

/**
 * @desc    Get orders for current user
 * @route   GET /api/orders
 * @access  Private
 */
exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { buyerId: req.user.id };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get single order by ID
 * @route   GET /api/orders/:id
 * @access  Private (buyer or seller)
 */
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('buyerId', 'name email phone');
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const isBuyer = order.buyerId._id.toString() === req.user.id;
    const isSeller = order.items.some(i => i.sellerId.toString() === req.user.id);
    if (!isBuyer && !isSeller) return res.status(403).json({ success: false, error: 'Unauthorized' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Cancel order (buyer only, before shipping)
 * @route   PUT /api/orders/:id/cancel
 * @access  Private (Buyer)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'Unauthorized' });
    if (!order.canCancel()) return res.status(400).json({ success: false, error: `Cannot cancel order with status ${order.status}` });

    if (order.storeCreditUsed > 0) {
      const buyer = await User.findById(order.buyerId);
      if (buyer) await buyer.addStoreCredit(order.storeCreditUsed, 'refund', `Refund for cancelled order #${order.orderNumber}`, null);
    }

    await order.cancel(req.body.reason || 'Cancelled by buyer');
    await dispatchEvent('order.cancelled', { event: 'order.cancelled', timestamp: new Date(), orderId: order._id, orderNumber: order.orderNumber, cancelReason: req.body.reason, cancelledAt: order.cancelledAt });

    // Restore stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        if (item.isDigital) product.soldCount -= item.quantity;
        else await product.increaseStock(item.quantity, item.selectedVariations);
        await product.save();
      }
    }

    // Reverse seller earnings if paid
    if (order.paymentStatus === 'paid' && order.sellerEarnings > 0 && order.items.length) {
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

    await invalidateRecommendations(order.buyerId);
    await notifyUser(order.buyerId, 'order_update', `Order #${order.orderNumber} cancelled`, `Your order has been cancelled.`, `/order/${order._id}`);
    res.json({ success: true, order, message: 'Order cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Update order status (seller)
 * @route   PUT /api/orders/:id/status
 * @access  Private (Seller)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, carrier } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (!order.items.some(i => i.sellerId.toString() === req.user.id)) {
      return res.status(403).json({ success: false, error: 'You do not have items in this order' });
    }

    const allowed = { pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
    if (!allowed[order.status].includes(status)) {
      return res.status(400).json({ success: false, error: `Cannot change status from ${order.status} to ${status}` });
    }

    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
      order.carrier = carrier || 'other';
    }
    await order.save();

    if (status === 'shipped') await dispatchEvent('order.shipped', { event: 'order.shipped', timestamp: new Date(), orderId: order._id, orderNumber: order.orderNumber, trackingNumber, carrier });
    if (status === 'delivered') await dispatchEvent('order.delivered', { event: 'order.delivered', timestamp: new Date(), orderId: order._id, orderNumber: order.orderNumber, deliveredAt: order.deliveredAt });

    if (status === 'shipped' && trackingNumber) {
      await sendEmail({ to: order.buyerInfo.email, subject: `Your order #${order.orderNumber} has been shipped`, html: shippingUpdateHtml(order, trackingNumber) }).catch(console.error);
    }

    await notifyUser(order.buyerId, 'order_update', `Order #${order.orderNumber} updated`, `Status: ${status}. ${trackingNumber ? `Tracking: ${trackingNumber}` : ''}`, `/order/${order._id}`);
    res.json({ success: true, order, message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};