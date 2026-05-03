const orderConfirmationHtml = (order, user) => `
  <h1>Order Confirmation</h1>
  <p>Hello ${user.name},</p>
  <p>Your order <strong>#${order.orderNumber}</strong> has been placed successfully.</p>
  <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
  <p>We'll notify you when your order ships.</p>
  <a href="${process.env.CLIENT_URL}/order/${order._id}">View Order</a>
`;

const shippingUpdateHtml = (order, trackingNumber) => `
  <h1>Order Shipped</h1>
  <p>Your order #${order.orderNumber} has been shipped.</p>
  <p>Tracking number: ${trackingNumber}</p>
  <a href="${process.env.CLIENT_URL}/order/${order._id}">Track Order</a>
`;

module.exports = { orderConfirmationHtml, shippingUpdateHtml };