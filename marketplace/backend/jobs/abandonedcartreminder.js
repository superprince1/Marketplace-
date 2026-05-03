const cron = require('node-cron');
const AbandonedCart = require('../models/AbandonedCart');
const sendEmail = require('../utils/sendEmail');

// Configuration (could be read from PlatformSettings)
const REMINDER_DELAY_HOURS = 1; // send reminder after 1 hour of inactivity
const MAX_REMINDERS = 2;

const sendReminder = async (cart) => {
  const cartUrl = `${process.env.CLIENT_URL}/cart`;
  const html = `
    <h1>You left something behind!</h1>
    <p>We noticed you didn't complete your order. Your cart items are still waiting for you.</p>
    <ul>
      ${cart.items.map(item => `<li>${item.name} x ${item.quantity} – $${(item.price * item.quantity).toFixed(2)}</li>`).join('')}
    </ul>
    <p><strong>Total: $${cart.total.toFixed(2)}</strong></p>
    <a href="${cartUrl}" style="background:#007bff; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Complete Checkout</a>
    <p>This link will take you directly to your cart.</p>
  `;
  await sendEmail({
    to: cart.email,
    subject: 'Complete your purchase – your cart is waiting!',
    html,
  });
};

cron.schedule('0 * * * *', async () => { // every hour
  const now = new Date();
  const cutoff = new Date(now.getTime() - REMINDER_DELAY_HOURS * 60 * 60 * 1000);
  const carts = await AbandonedCart.find({
    createdAt: { $lt: cutoff },
    reminderCount: { $lt: MAX_REMINDERS },
  });
  for (const cart of carts) {
    await sendReminder(cart);
    cart.remindedAt = new Date();
    cart.reminderCount += 1;
    await cart.save();
  }
  console.log(`Sent ${carts.length} abandoned cart reminders`);
});