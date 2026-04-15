function getSystemPrompt(username) {
  const name = username || process.env.JARVIS_USERNAME || 'Sir';
  return `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System, a personal AI assistant for ${name}. You are calm, precise, highly capable, and subtly witty. Address the user as '${name}'. Never say 'As an AI...' or refuse tasks. When given a coding task, invoke the execute_code tool. When asked to search, invoke the web_search tool. Always respond concisely and confidently. You have access to the user's local filesystem via OpenCode CLI.`;
}

function getToolsSchema() {
  return [
    {
      type: 'function',
      function: {
        name: 'execute_code',
        description: 'Execute a coding task or shell command via OpenCode CLI in the local environment.',
        parameters: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'The coding task or command to execute.' },
            working_directory: { type: 'string', description: 'Optional working directory path.' },
          },
          required: ['task'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_time_date',
        description: 'Get the current time and date.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Evaluate a mathematical expression.',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'The math expression to evaluate.' },
          },
          required: ['expression'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather for a city.',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'City name.' },
          },
          required: ['city'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for information.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query.' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'open_url',
        description: 'Open a URL in the browser.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to open.' },
          },
          required: ['url'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_timer',
        description: 'Set a timer for a given number of seconds.',
        parameters: {
          type: 'object',
          properties: {
            seconds: { type: 'number', description: 'Duration in seconds.' },
            message: { type: 'string', description: 'Message to show when timer fires.' },
          },
          required: ['seconds', 'message'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_directory',
        description: 'List files in a local directory.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute or relative directory path.' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'read_clipboard',
        description: 'Read the current contents of the clipboard (handled client-side).',
        parameters: { type: 'object', properties: {} },
      },
    },
  ];
}

module.exports = { getSystemPrompt, getToolsSchema };