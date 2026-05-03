const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');
const Paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
const { CoinbaseCommerce } = require('coinbase-commerce-node');

const Client = paypal.core.PayPalHttpClient;
const environment = new paypal.core.LiveEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new Client(environment);

// Stripe
const createStripePayment = async (order, successUrl, cancelUrl) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Order #${order.orderNumber}` },
        unit_amount: Math.round(order.total * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orderId: order._id.toString() },
  });
  return { url: session.url, paymentId: session.id };
};

// PayPal
const createPayPalPayment = async (order, successUrl, cancelUrl) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'USD', value: order.total.toFixed(2) },
      reference_id: order._id.toString(),
    }],
    application_context: {
      return_url: successUrl,
      cancel_url: cancelUrl,
    },
  });
  const response = await paypalClient.execute(request);
  const approvalLink = response.result.links.find(l => l.rel === 'approve').href;
  return { url: approvalLink, paymentId: response.result.id };
};

// Paystack
const createPaystackPayment = async (order, successUrl, cancelUrl) => {
  const response = await Paystack.transaction.initialize({
    amount: Math.round(order.total * 100),
    email: order.buyerInfo.email,
    reference: `ORDER_${order._id}_${Date.now()}`,
    callback_url: successUrl,
    metadata: { orderId: order._id.toString() },
  });
  return { url: response.data.authorization_url, paymentId: response.data.reference };
};

// Coinbase
const createCoinbasePayment = async (order, successUrl, cancelUrl) => {
  const { resources } = CoinbaseCommerce;
  const charge = await resources.Charge.create({
    name: `Order #${order.orderNumber}`,
    description: `Payment for order ${order.orderNumber}`,
    pricing_type: 'fixed_price',
    local_price: { amount: order.total.toFixed(2), currency: 'USD' },
    redirect_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orderId: order._id.toString() },
  });
  return { url: charge.hosted_url, paymentId: charge.id };
};

module.exports = {
  createStripePayment,
  createPayPalPayment,
  createPaystackPayment,
  createCoinbasePayment,
};