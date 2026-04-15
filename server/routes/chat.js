const express = require('express');
const router = express.Router();
const { getSystemPrompt, getToolsSchema } = require('../utils/system-prompt');

let messages = [];
let isProcessing = false;
const MAX_MESSAGES = 20;

function sseSetup(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
}

function send(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function callOllama(res) {
  const username = process.env.JARVIS_USERNAME || 'Sir';
  const systemMsg = { role: 'system', content: getSystemPrompt(username) };
  
  const model = process.env.OLLAMA_MODEL || 'gemma4:e4b';
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [systemMsg, ...messages],
        stream: true,
        tools: getToolsSchema(),
      }),
    });
    
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('Ollama error:', response.status, body);
      send(res, { type: 'error', content: `Ollama error ${response.status}. Please try again, Sir.` });
      return null;
    }
    
    return response;
  } catch (e) {
    console.error('Ollama connection error:', e.message);
    send(res, { type: 'error', content: 'Cannot connect to local Ollama. Please ensure Ollama is running.' });
    return null;
  }
}

async function streamResponse(res, response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let assistantContent = '';
  let buffer = '';
  const toolCallsMap = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;

        let chunk;
        try { chunk = JSON.parse(raw); } catch { continue; }

        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          assistantContent += delta.content;
          send(res, { type: 'delta', content: delta.content });
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallsMap[idx]) toolCallsMap[idx] = { id: '', name: '', arguments: '' };
            if (tc.id) toolCallsMap[idx].id = tc.id;
            if (tc.function?.name) toolCallsMap[idx].name += tc.function.name;
            if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
          }
        }
      }
    }
  } catch {
    send(res, { type: 'error', content: 'Stream read error.' });
    return;
  }

  const toolCalls = Object.values(toolCallsMap);
  for (const tc of toolCalls) {
    let args = {};
    try { args = JSON.parse(tc.arguments); } catch { args = { raw: tc.arguments }; }
    send(res, { type: 'tool_call', id: tc.id, name: tc.name, arguments: args });
  }

  const assistantMessage = { role: 'assistant' };
  if (assistantContent) assistantMessage.content = assistantContent;
  if (toolCalls.length > 0) {
    assistantMessage.tool_calls = toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: tc.arguments },
    }));
    if (!assistantContent) assistantMessage.content = null;
  }
  messages.push(assistantMessage);
}

router.post('/reset', (req, res) => {
  messages = [];
  res.json({ ok: true });
});

router.post('/', async (req, res) => {
  if (isProcessing) {
    return res.status(429).json({ error: 'Please wait, processing your previous request, Sir.' });
  }
  
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES);
  }
  
  messages.push({ role: 'user', content: message });
  sseSetup(res);
  
  isProcessing = true;

  const response = await callOllama(res);
  isProcessing = false;
  
  if (!response) {
    messages.pop();
    send(res, { type: 'done' });
    return res.end();
  }

  await streamResponse(res, response);
  send(res, { type: 'done' });
  res.end();
});

router.post('/tool-result', async (req, res) => {
  if (isProcessing) {
    return res.status(429).json({ error: 'Please wait, processing your previous request, Sir.' });
  }

  const { tool_call_id, name, result } = req.body;
  if (!tool_call_id || !name) {
    return res.status(400).json({ error: 'tool_call_id and name are required' });
  }

  const content = typeof result === 'string' ? result : JSON.stringify(result);
  messages.push({ role: 'tool', tool_call_id, content });

  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES);
  }

  sseSetup(res);

  isProcessing = true;

  const response = await callOllama(res);
  isProcessing = false;
  if (!response) {
    messages.pop();
    send(res, { type: 'done' });
    return res.end();
  }

  await streamResponse(res, response);
  send(res, { type: 'done' });
  res.end();
});

module.exports = router;