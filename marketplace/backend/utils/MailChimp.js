const mailchimp = require('@mailchimp/mailchimp_marketing');

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX,
});

const addSubscriber = async (email, listId, tags = []) => {
  try {
    const response = await mailchimp.lists.addListMember(listId, {
      email_address: email,
      status: 'subscribed',
      tags,
    });
    return { success: true, id: response.id };
  } catch (err) {
    if (err.response?.body?.title === 'Member Exists') {
      return { success: false, error: 'Already subscribed' };
    }
    return { success: false, error: err.message };
  }
};

module.exports = { addSubscriber };