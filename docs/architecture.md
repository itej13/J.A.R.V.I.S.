# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐  │
│  │  3D Energy  │  │   Voice     │  │      Chat Interface             │  │
│  │    Orb      │  │   Input     │  │   (Messages + Tool Results)     │  │
│  │ (Three.js)  │  │             │  │                                  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTP/SSE
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVER (Express.js)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐  │
│  │   /chat     │  │   /tools    │  │      /claude-code               │  │
│  │   (SSE)     │  │  (utilities)│  │   (OpenCode session mgmt)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐    ┌─────────────────────────┐
│  Ollama         │   │  Local APIs     │    │   OpenCode CLI          │
│  (gemma4:e4b)   │   │ (Weather, etc)  │    │   (Code Execution)      │
└─────────────────┘   └─────────────────┘    └─────────────────────────┘
```

## Data Flow: Chat Message

```
User Types/Voice Input
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Client sends POST /chat with message                         │
│    { message: "What's the weather in Tokyo?", history: [...] } │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Server calls Ollama API with:                            │
│    - System prompt (J.A.R.V.I.S. persona)                  │
│    - Tool schemas (all available tools)                    │
│    - Conversation history                                  │
│    - Current message                                       │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Ollama streams response via SSE                          │
│    - May include tool_call or plain text                    │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              ┌────────────┴────────────┐
              │                         │
         Tool Call                 Plain Text
              │                         │
              ▼                         ▼
┌─────────────────────┐    ┌───────────────────────────────────┐
│ 4a. Client receives │    │ 4b. Display as Jarvis response   │
│    tool_call event  │    │    + TTS output                  │
│    + executes tool  │    └───────────────────────────────────┘
└─────────┬───────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Client POSTs result to /tool-result                          │
│    { tool_call_id, result: "28°C, sunny" }                     │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Server re-calls Ollama with tool result                  │
│    Model generates final response incorporating the result │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. Server streams final response to client                     │
│    Display + TTS                                               │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow: Code Execution

```
User: "Create a hello.js file with console.log('Hello Jarvis')"
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Ollama returns tool_call: execute_code                       │
│    { task: "create hello.js with console.log('Hello Jarvis')" }│
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Client POSTs to /claude-code/execute                        │
│    { task: "create hello.js...", session_id: null }            │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              ┌────────────┴────────────┐
              │                         │
         New Session             Existing Session
              │                         │
              ▼                         ▼
┌─────────────────────┐    ┌───────────────────────────────────┐
│ 3a. Server spawns   │    │ 3b. Reuse existing               │
│    new OpenCode     │    │    OpenCode process              │
│    process          │    └───────────────────────────────────┘
└─────────┬───────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. OpenCode CLI executes task, streams output via stdout       │
│    Server proxies activity_log events to client               │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Client displays activity feed:                              │
│    > Creating file...                                          │
│    > File created: /Users/.../hello.js                         │
│    > Command completed successfully                             │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Server returns final result to client                       │
│    Client sends tool_result to /tool-result                    │
│    OpenRouter generates final response                          │
└──────────────────────────────────────────────────────────────────┘
```

## Key Components

### client/app.js
- Manages 3D orb rendering (WebGL/Canvas)
- Handles voice input (SpeechRecognition) and output (SpeechSynthesis)
- Executes tool calls and posts results
- Displays chat messages and activity logs

### server/routes/chat.js
- SSE endpoint `/chat` for streaming responses
- `/tool-result` for receiving tool execution results
- Handles tool call loop until no more calls needed

### server/routes/claude-code.js
- Session management (creates/reuses OpenCode processes)
- Task execution with activity streaming
- Process cleanup on session end

### server/utils/spawn-claude.js
- Spawns OpenCode CLI as child process
- Streams stdout/stderr to server
- Handles process lifecycle

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `OLLAMA_MODEL` | LLM model name (gemma4:e4b) |
| `OLLAMA_BASE_URL` | Ollama API endpoint |
| `OPENWEATHER_API_KEY` | Weather tool integration |
| `JARVIS_USERNAME` | Personalized address |
| `CLAUDE_WORKING_DIR` | Default code execution directory |
| `PORT` | Server port (default 3001) |