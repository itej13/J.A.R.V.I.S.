const express = require('express');
const router = express.Router();
const fs = require('fs');
const { evaluate } = require('mathjs');

const pendingAlerts = [];

router.get('/time', (req, res) => {
  try {
    const now = new Date();
    res.json({
      time: now.toLocaleTimeString(),
      date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/calculate', (req, res) => {
  try {
    const { expression } = req.body;
    if (!expression) return res.status(400).json({ error: 'expression is required' });

    const result = evaluate(expression);
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: `Could not evaluate expression: ${err.message}` });
  }
});

router.get('/weather', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: 'city is required' });

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Weather API key not configured' });

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: body.message || 'Weather lookup failed' });
    }

    const data = await response.json();
    res.json({
      city: data.name,
      temp: data.main.temp,
      description: data.weather[0].description,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/directory', (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: 'path is required' });

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    res.json(entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/open-url', (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/timer', (req, res) => {
  try {
    const { seconds, message } = req.body;
    if (seconds == null || !message) return res.status(400).json({ error: 'seconds and message are required' });

    setTimeout(() => {
      pendingAlerts.push({ message, firedAt: new Date().toISOString() });
    }, seconds * 1000);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alerts', (req, res) => {
  res.json(pendingAlerts.splice(0));
});

module.exports = router;