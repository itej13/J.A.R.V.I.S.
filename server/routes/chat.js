const express = require('express');
const router = express.Router();
const { getSystemPrompt, getToolsSchema } = require('../utils/system-prompt');
const toolsRouter = require('./tools');

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

async function executeTool(name, args) {
  switch (name) {
    case 'execute_code': {
      const { spawnOpenCode } = require('../utils/spawn-claude');
      const masterPrompt = `You are an expert software developer. The user wants you to: ${args.task}\n\nPlease analyze the requirements, create the necessary files, and implement the solution. Work in the user's working directory. Execute the task completely and report back what you did.`;
      
      const rawOutput = await new Promise((resolve) => {
        const emitter = spawnOpenCode({ task: masterPrompt, workingDir: args.working_directory });
        let output = '';
        
        emitter.on('data', (data) => {
          const content = data.content || data.text || JSON.stringify(data);
          output += content + '\n';
        });
        
        emitter.on('error', (err) => {
          output += `\nError: ${err.message}`;
        });
        
        emitter.on('done', (code) => {
          output += `\nExit code: ${code}`;
        });
      });
      
      const truncatedOutput = rawOutput.length > 8000 ? rawOutput.slice(0, 8000) + '\n[...output truncated...]' : rawOutput;
      
      const summaryPrompt = `You are JARVIS, Tony Stark's AI assistant. A code execution just completed. Your job is to summarize what happened for the user in a clean, concise way.

CODE EXECUTION OUTPUT:
${truncatedOutput}

INSTRUCTIONS:
- Write a SHORT summary (2-4 sentences max)
- Focus on: what was created/modified, any errors, whether it succeeded
- NEVER repeat file paths or raw code
- NEVER use bullet points or lists in raw output form
- Use phrases like "Completed, Sir." or "Executing, Sir."
- If there were errors, mention them briefly but reassuringly
- Keep it conversational but professional`;

      const summaryResponse = await fetch(`${process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer lm-studio',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: summaryPrompt }],
          stream: false,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        return { summary: summaryData.choices?.[0]?.message?.content || 'Task completed, Sir.' };
      } else {
        return { summary: 'Task completed, Sir.', rawError: 'Could not generate summary' };
      }
    }
    case 'get_time_date':
      return { time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString() };
    case 'calculate':
      const math = require('mathjs');
      try {
        return { result: math.evaluate(args.expression) };
      } catch (e) {
        return { error: e.message };
      }
    case 'get_weather':
      return { error: 'Weather requires city parameter' };
    case 'web_search':
      return { error: 'Web search not implemented' };
    case 'set_timer':
      return { success: true, message: `Timer set for ${args.seconds} seconds` };
    case 'list_directory':
      const fs = require('fs');
      try {
        const entries = fs.readdirSync(args.path, { withFileTypes: true });
        return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }));
      } catch (e) {
        return { error: e.message };
      }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function callLLM(res) {
  const username = process.env.JARVIS_USERNAME || 'Sir';
  const systemMsg = { role: 'system', content: getSystemPrompt(username) };

  const baseUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1';

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      body: JSON.stringify({
        messages: [systemMsg, ...messages],
        stream: true,
        tools: getToolsSchema(),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('LM Studio error:', response.status, body);
      send(res, { type: 'error', content: `LM Studio error ${response.status}. Please try again, Sir.` });
      return null;
    }

    return response;
  } catch (e) {
    console.error('LM Studio connection error:', e.message);
    send(res, { type: 'error', content: 'Cannot connect to LM Studio. Please ensure LM Studio local server is running.' });
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
  
  if (toolCalls.length > 0 && assistantContent.trim() === '') {
    send(res, { type: 'tool_call', name: 'executing', content: 'Processing tool...' });
    
    for (const tc of toolCalls) {
      let args = {};
      try { args = JSON.parse(tc.arguments); } catch { args = { raw: tc.arguments }; }
      
      const result = await executeTool(tc.name, args);
      
      let resultContent;
      if (result.summary) {
        resultContent = result.summary;
      } else {
        resultContent = typeof result === 'string' ? result : JSON.stringify(result);
      }
      
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: resultContent
      });
    }
    
    send(res, { type: 'tool_done', content: 'Tools executed' });
    
    const followUpResponse = await callLLM(res);
    if (followUpResponse) {
      await streamResponse(res, followUpResponse);
    }
  } else {
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

  const response = await callLLM(res);
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

  const response = await callLLM(res);
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