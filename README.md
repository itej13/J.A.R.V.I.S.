# 🤖 J.A.R.V.I.S. — Just A Rather Very Intelligent System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Platform-macOS](https://img.shields.io/badge/Platform-macOS-purple.svg)](https://apple.com/macos)

An open-source, locally-hosted AI assistant inspired by Iron Man. Voice-controlled, with live OpenCode CLI integration for autonomous coding. No external API costs — runs entirely on your machine using local LLM via Ollama.

![Jarvis HUD](docs/screenshot.png)

## Features

- 🎙️ **Voice Activation** — "Hey Jarvis" wake word detection with speech-to-text
- 🎤 **Voice Output** — Streaming text-to-speech responses
- ⚡ **3D Holographic UI** — Cinematic orange energy orb with audio reactivity
- 🔧 **Tool Calling** — Automated execution of math, weather, timers, and more
- 💻 **Autonomous Coding** — OpenCode CLI integration for real code execution
- 🔒 **Privacy-First** — All processing runs locally, no external API calls except weather

## Requirements

- **Node.js** 18+
- **macOS** (developed and tested on macOS)
- **Ollama** installed with `gemma4:e4b` model
- **OpenCode CLI** for autonomous code execution

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/itej13/J.A.R.V.I.S..git
cd J.A.R.V.I.S.

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your settings

# 4. Install and run Ollama
# Download from https://ollama.com or: brew install ollama
ollama serve &
ollama pull gemma4:e4b

# 5. Install OpenCode CLI
npm i -g opencode

# 6. Start the server
npm start

# 7. Open in browser
# Navigate to http://localhost:3001 in Chrome or Edge
```

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Client    │────▶│   Server    │────▶│   Ollama         │
│  (Browser)  │◀────│ (Express)   │◀────│ (gemma4:e4b)     │
└─────────────┘     └─────────────┘     └──────────────────┘
       │                   │
       │                   ▼
       │            ┌──────────────────┐
       │            │   OpenCode CLI   │
       │            │ (Code Execution) │
       │            └──────────────────┘
       ▼
┌─────────────────────────────────────┐
│      3D Energy Orb + Voice I/O      │
└─────────────────────────────────────┘
```

### Architecture

1. **Frontend**: Browser-based UI with WebGL energy orb, Web Speech API for voice
2. **Backend**: Express server proxies requests, manages sessions, handles tool execution
3. **AI Layer**: Ollama (gemma4:e4b) for conversation + OpenCode CLI for code tasks

## Built-in Tools

| Tool | Trigger Phrase | Description |
|------|----------------|-------------|
| `execute_code` | "write code", "create file", "run command" | Execute code via OpenCode CLI |
| `get_time_date` | "what time", "date" | Current time and date |
| `calculate` | "calculate", "compute", "what is" | Mathematical evaluation |
| `get_weather` | "weather in [city]" | Current weather conditions (requires API key) |
| `web_search` | "search for", "look up" | Web search via DuckDuckGo |
| `open_url` | "open [url]" | Launch URL in default browser |
| `set_timer` | "set timer for [n] seconds" | Countdown timer with notification |
| `list_directory` | "list files in [path]" | Browse local filesystem |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| Server | Express.js |
| AI | Ollama (gemma4:e4b via local API) |
| Code Execution | OpenCode CLI |
| Frontend | Vanilla JavaScript + Three.js |
| Voice | Web Speech API |
| Math | mathjs |

## Configuration

Create a `.env` file with the following variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OLLAMA_MODEL` | Yes | Model to use (default: gemma4:e4b) |
| `OLLAMA_BASE_URL` | Yes | Ollama API URL (default: http://localhost:11434/v1) |
| `OPENWEATHER_API_KEY` | No | OpenWeatherMap API for weather tool |
| `JARVIS_USERNAME` | No | Name Jarvis calls you (default: "Sir") |
| `CLAUDE_WORKING_DIR` | No | Default directory for code execution (default: ~) |
| `PORT` | No | Server port (default: 3001) |

## Browser Compatibility

- **Chrome** — Full support (recommended)
- **Edge** — Full support
- **Firefox/Safari** — Limited (Web Speech API not fully supported)

## Security

- All processing runs locally via Ollama
- API keys stored in `.env`, which is `.gitignore`d
- Keys never exposed to the frontend
- Code execution runs locally via OpenCode CLI

## Troubleshooting

**Ollama not responding?**
```bash
# Make sure Ollama is running
ollama serve

# Check if model is available
ollama list
```

**OpenCode not working?**
```bash
# Re-authenticate
opencode auth
```

## Roadmap

### Phase 2 — Enhanced Memory
- Conversation history persistence
- User preferences storage
- Context carryover across sessions

### Phase 3 — Expanded Integration
- Home automation hooks (HomeKit, SmartThings)
- Calendar and task management
- Email/SMS integration

### Phase 4 — Multi-Modal
- Image analysis and generation
- Document processing
- Custom voice profiles

## Contributing

Want to add a new tool? See the [Developer Guide](docs/adding-tools.md) for step-by-step instructions.

---

**License**: MIT  
**Author**: Tejas Das  
**Repository**: [github.com/itej13/J.A.R.V.I.S.](https://github.com/itej13/J.A.R.V.I.S.)