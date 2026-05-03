const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const auth = require('../middleware/auth');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate product description
router.post('/generate-description', auth, async (req, res) => {
  try {
    const { name, category, keywords } = req.body;
    const prompt = `Write a compelling product description for a "${name}" in the "${category}" category. Keywords: ${keywords}. The description should be persuasive, highlight benefits, and be around 150 words.`;
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });
    const description = response.choices[0].message.content;
    res.json({ success: true, description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Generate product title suggestions
router.post('/generate-title', auth, async (req, res) => {
  try {
    const { keywords } = req.body;
    const prompt = `Generate 5 SEO-friendly product titles for a product with these keywords: ${keywords}. Return only the titles, each on a new line.`;
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 150,
    });
    const titles = response.choices[0].message.content.split('\n').filter(t => t.trim());
    res.json({ success: true, titles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI chatbot answer
router.post('/chat', auth, async (req, res) => {
  try {
    const { question } = req.body;
    const prompt = `You are a helpful customer support assistant for an online marketplace. Answer the user's question concisely and helpfully: ${question}`;
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 200,
    });
    const answer = response.choices[0].message.content;
    res.json({ success: true, answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;