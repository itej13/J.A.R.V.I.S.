# Adding Tools to J.A.R.V.I.S.

This guide walks you through adding a new tool to J.A.R.V.I.S. in 4 steps.

## Overview

Tool calling in J.A.R.V.I.S. works in a loop:
1. **LLM** decides to call a tool → returns `tool_call`
2. **Client** receives tool_call → executes it
3. **Client** sends result to `/tool-result`
4. **LLM** receives result → generates final response

To add a tool, you need to update 3 files:
- `server/utils/system-prompt.js` — Tool schema (what the LLM knows about your tool)
- `server/routes/tools.js` — Backend endpoint
- `client/app.js` — Frontend handler

---

## Step 1: Add Tool Schema

Edit `server/utils/system-prompt.js`, add to `getToolsSchema()`:

```javascript
{
  type: 'function',
  function: {
    name: 'joke',
    description: 'Get a random joke.',
    parameters: {
      type: 'object',
      properties: {
        category: { 
          type: 'string', 
          description: 'Category: programming, general, or knock-knock',
          enum: ['programming', 'general', 'knock-knock']
        }
      }
    }
  }
}
```

---

## Step 2: Implement Backend Route

Edit `server/routes/tools.js`, add:

```javascript
const jokes = {
  programming: [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "What do you call a fake noodle? An impasta.",
    "Why did the developer go broke? Because he used up all his cache."
  ],
  general: [
    "What do you call a bear with no teeth? A gummy bear.",
    "Why don't scientists trust atoms? Because they make up everything."
  ],
  'knock-knock': [
    "Knock-knock. Who's there? Lettuce. Lettuce who? Lettuce in, it's cold out here!"
  ]
};

router.post('/joke', (req, res) => {
  const { category = 'general' } = req.body;
  const categoryJokes = jokes[category] || jokes.general;
  const joke = categoryJokes[Math.floor(Math.random() * categoryJokes.length)];
  res.json({ joke });
});
```

**Important**: Update the system prompt in `getSystemPrompt()` to mention the new tool so the LLM knows when to use it:
```javascript
// Add to the system prompt description:
// "You can also tell jokes via the joke tool."
```

---

## Step 3: Add Frontend Handler

Edit `client/app.js`, find the `executeTool()` function and add:

```javascript
case 'joke':
  const jokeRes = await fetch('/tools/joke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: toolCall.arguments?.category })
  });
  const jokeData = await jokeRes.json();
  return `Here's a joke: ${jokeData.joke}`;
```

---

## Step 4: Test

1. Restart the server: `npm start`
2. Open http://localhost:3001
3. Say/type: "Tell me a programming joke"
4. Or type: "Jarvis, tell me a knock-knock joke"

---

## Full Example: Currency Converter

### 1. Schema (system-prompt.js)
```javascript
{
  type: 'function',
  function: {
    name: 'convert_currency',
    description: 'Convert between currencies using exchange rates.',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount to convert' },
        from: { type: 'string', description: 'Source currency (e.g., USD, EUR)' },
        to: { type: 'string', description: 'Target currency (e.g., USD, EUR)' }
      },
      required: ['amount', 'from', 'to']
    }
  }
}
```

### 2. Backend (tools.js)
```javascript
const exchangeRates = { USD: 1, EUR: 0.85, GBP: 0.73, JPY: 110, INR: 74 };

router.post('/convert-currency', (req, res) => {
  const { amount, from, to } = req.body;
  const rate = exchangeRates[to] / exchangeRates[from];
  const result = (amount * rate).toFixed(2);
  res.json({ result: `${amount} ${from} = ${result} ${to}` });
});
```

### 3. Frontend (app.js)
```javascript
case 'convert_currency':
  const convRes = await fetch('/tools/convert-currency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toolCall.arguments)
  });
  const convData = await convRes.json();
  return convData.result;
```

---

## Tips

- **Naming**: Use snake_case for tool names (e.g., `get_weather`, not `getWeather`)
- **Descriptions**: Write clear, concise descriptions so the LLM knows when to call your tool
- **Parameters**: Include `required` array if parameters are mandatory
- **Testing**: Use text input first, then test with voice

## Troubleshooting

| Issue | Solution |
|-------|----------|
| LLM not calling tool | Check system prompt mentions the tool |
| Tool called but not executing | Verify frontend switch case matches tool name |
| Wrong parameters | Check schema matches what client sends |
| 404 on endpoint | Ensure route is added to server/index.js |