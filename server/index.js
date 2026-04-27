require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const chatRoutes = require('./routes/chat');
const claudeCodeRoutes = require('./routes/claude-code');
const toolsRoutes = require('./routes/tools');
const ttsRoutes = require('./routes/tts');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/claude-code', claudeCodeRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/tts', ttsRoutes);

app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`J.A.R.V.I.S. running on http://localhost:${PORT}`);
});