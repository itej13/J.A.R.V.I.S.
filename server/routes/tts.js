const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_SCRIPT = path.join(__dirname, '..', 'tts_server.py');

router.post('/speak', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const python = spawn('python3', [PYTHON_SCRIPT], {
        cwd: path.join(__dirname, '..')
      });
      
      let output = '';
      let error = '';
      
      python.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error || `Process exited with code ${code}`));
        }
      });
      
      python.on('error', reject);
      
      python.stdin.write(JSON.stringify({ text }));
      python.stdin.end();
    });

    const outputPath = path.join(__dirname, '..', 'temp_output.wav');
    
    if (fs.existsSync(outputPath)) {
      const audioBuffer = fs.readFileSync(outputPath);
      fs.unlinkSync(outputPath);
      
      res.setHeader('Content-Type', 'audio/wav');
      res.send(audioBuffer);
    } else {
      res.status(500).json({ error: 'Audio file not generated' });
    }
  } catch (e) {
    console.error('TTS error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/status', (req, res) => {
  const voicePath = path.join(__dirname, '..', '..', 'client', 'assets', 'voice.wav');
  res.json({ 
    ready: true, 
    voiceLoaded: fs.existsSync(voicePath),
    voicePath: voicePath
  });
});

module.exports = router;