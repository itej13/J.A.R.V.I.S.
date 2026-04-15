const express = require('express');
const router = express.Router();
const { spawnOpenCode } = require('../utils/spawn-claude');

const sessions = new Map();

function makeSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

router.post('/execute', (req, res) => {
  try {
    const { task, workingDirectory } = req.body;
    if (!task) return res.status(400).json({ error: 'task is required' });

    const sessionId = makeSessionId();
    const emitter = spawnOpenCode({ task, workingDir: workingDirectory, sessionId });

    const session = { emitter, sseRes: null, buffer: [], done: false };
    sessions.set(sessionId, session);

    emitter.on('data', (parsed) => {
      const content = parsed.content || parsed.text || JSON.stringify(parsed);
      const type = parsed.type || 'text';
      const forwardObj = { type, content };
      if (session.sseRes) {
        session.sseRes.write(`data: ${JSON.stringify(forwardObj)}\n\n`);
      } else {
        session.buffer.push(forwardObj);
      }
    });

    emitter.on('error', (err) => {
      const errorObj = { type: 'error', content: err.message };
      if (session.sseRes) {
        session.sseRes.write(`data: ${JSON.stringify(errorObj)}\n\n`);
      } else {
        session.buffer.push(errorObj);
      }
    });

    emitter.on('done', (exitCode) => {
      const doneObj = { type: 'done', exitCode };
      if (session.sseRes) {
        session.sseRes.write(`data: ${JSON.stringify(doneObj)}\n\n`);
      } else {
        session.buffer.push(doneObj);
      }
      session.done = true;
    });

    res.json({ sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stream/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Session not found or already completed.' })}\n\n`);
      return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for (const obj of session.buffer) {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    }
    session.buffer = [];
    session.sseRes = res;

    if (session.done) {
      res.write(`data: ${JSON.stringify({ type: 'done', exitCode: 0 })}\n\n`);
    }

    req.on('close', () => {
      session.sseRes = null;
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stop/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (typeof session.emitter.kill === 'function') {
      session.emitter.kill();
    }
    sessions.delete(sessionId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;