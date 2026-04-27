# 🤖 J.A.R.V.I.S. — Just A Rather Very Intelligent System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Platform-macOS](https://img.shields.io/badge/Platform-macOS-purple.svg)](https://apple.com/macos)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org)

An open-source, locally-hosted AI assistant inspired by Iron Man's J.A.R.V.I.S. Voice-controlled with custom voice cloning, real-time 3D particle visualization, and autonomous code execution.

![J.A.R.V.I.S. Interface](docs/screenshot.png)

## ✨ Features

- 🎙️ **Voice Activation** — Web Speech API for continuous voice input
- 🎤 **Voice Output** — Custom TTS with your own voice via voice cloning
- ⚡ **3D Particle Sphere** — Cinematic blue energy orb with voice reactivity and continuous rotation
- 🔧 **Tool Calling** — Automated execution of math, weather, timers, web search, and more
- 💻 **Autonomous Coding** — OpenCode CLI integration for real code execution
- 📝 **Process Log** — Real-time status display showing JARVIS thinking/doing
- 🔒 **Privacy-First** — All processing runs locally, no external API calls

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/itej13/J.A.R.V.I.S..git
cd J.A.R.V.I.S.

# 2. Install Node.js dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your settings

# 4. Install Python dependencies (for TTS)
pip3 install onnxruntime sentencepiece numpy soundfile

# 5. Download ONNX TTS models
# See ONNX Models section below

# 6. Start LM Studio and load a model
# Download from https://lmstudio.ai
# Load a model (e.g., llama-3.2-3b-instruct)

# 7. Start the server
npm start

# 8. Open in browser
# Navigate to http://localhost:3001
```

## 📋 Requirements

| Component | Version | Description |
|-----------|---------|-------------|
| **Node.js** | 18+ | JavaScript runtime |
| **Python** | 3.10+ | For ONNX TTS inference |
| **LM Studio** | Latest | Local LLM (replaces Ollama) |
| **macOS** | Monterey+ | Developed on macOS |
| **OpenCode CLI** | Latest | Code execution |

### ONNX TTS Models

Download the English TTS models (english_2026-04) and place in `onnx_models/`:

```bash
# Create directory
mkdir -p onnx_models/english_2026-04

# Download from HuggingFace
# Option 1: Using huggingface-cli
huggingface-cli download KevinAHM/pocket-tts-onnx english_2026-04 --local-dir onnx_models/english_2026-04

# Option 2: Manual download
# Visit: https://huggingface.co/KevinAHM/pocket-tts-onnx/tree/main/english_2026-04
```

### Environment Variables

Create a `.env` file:

```env
# LM Studio (required)
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=llama-3.2-3b-instruct

# Pocket TTS ONNX (required)
HF_TOKEN=your_huggingface_token  # For voice cloning models

# Optional
PORT=3001
JARVIS_USERNAME=Sir
CLAUDE_WORKING_DIR=~
OPENWEATHER_API_KEY=your_api_key
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        J.A.R.V.I.S.                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌──────────────────┐  │
│  │   Client    │────▶│   Server    │────▶│   LM Studio      │  │
│  │  (Browser)  │◀────│ (Express)   │◀────│ (Local LLM)      │  │
│  └─────────────┘     └─────────────┘     └──────────────────┘  │
│        │                   │                                     │
│        │                   ▼                                     │
│        │            ┌──────────────────┐                        │
│        │            │   OpenCode CLI   │                        │
│        │            │ (Code Execution) │                        │
│        │            └──────────────────┘                        │
│        │                   │                                     │
│        │                   ▼                                     │
│        │            ┌──────────────────┐                        │
│        │            │  Pocket TTS     │                        │
│        │            │ (ONNX + Voice   │                        │
│        │            │  Cloning)        │                        │
│        │            └──────────────────┘                        │
│        ▼                                                             │
│  ┌─────────────────────────────────────┐                         │
│  │   3D Particle Sphere + Voice I/O    │                         │
│  └─────────────────────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend** | Vanilla JS + Three.js | 3D particle sphere, voice I/O |
| **Backend** | Express.js | REST API, session management |
| **LLM** | LM Studio (via OpenAI-compatible API) | Conversation & reasoning |
| **TTS** | Pocket TTS ONNX + Voice Cloning | Custom voice synthesis |
| **Code** | OpenCode CLI | Autonomous code execution |

## 🛠️ Built-in Tools

| Tool | Trigger | Description |
|------|---------|-------------|
| `execute_code` | "write code", "create file" | Execute code via OpenCode |
| `get_time_date` | "what time", "date" | Current time and date |
| `calculate` | "calculate", "what is" | Math evaluation |
| `get_weather` | "weather in [city]" | Weather conditions |
| `web_search` | "search for" | Web search |
| `open_url` | "open [url]" | Launch browser |
| `set_timer` | "set timer" | Countdown timer |
| `list_directory` | "list files" | Browse filesystem |

## 🎙️ Voice Cloning Setup

1. Record a 10-15 second voice sample (consistent volume, mono, 24kHz)
2. Place as `client/assets/voice.wav`
3. Run TTS server to process: `python3 server/tts_server.py`
4. JARVIS will speak with your voice!

## 📁 Project Structure

```
J.A.R.V.I.S./
├── client/                 # Frontend (browser)
│   ├── index.html         # Main UI
│   ├── style.css          # Theme styling
│   ├── particles.js       # 3D particle sphere
│   ├── ui.js             # Voice I/O handling
│   └── app.js            # Main app logic
├── server/                # Backend (Express)
│   ├── index.js          # Server entry point
│   ├── routes/
│   │   ├── chat.js       # LLM chat endpoint
│   │   ├── tts.js        # TTS endpoint
│   │   ├── tools.js      # Tool execution
│   │   └── claude-code.js # OpenCode integration
│   └── tts_server.py    # Pocket TTS ONNX wrapper
├── onnx_models/           # TTS ONNX models
├── docs/                  # Documentation
└── package.json          # Node dependencies
```

## 🔧 Development

### Adding New Tools

See [docs/adding-tools.md](docs/adding-tools.md) for step-by-step instructions.

### Running in Development

```bash
npm run dev
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Stream chat with LLM (SSE) |
| `/tts` | POST | Generate speech with voice cloning |
| `/tools` | GET | List available tools |
| `/tools/execute` | POST | Execute a specific tool |
| `/claude-code/execute` | POST | Execute code via OpenCode |

## 🔐 Security

- All processing runs locally via LM Studio
- API keys stored in `.env` (gitignored)
- Keys never exposed to frontend
- Code execution sandboxed via OpenCode

## 🐛 Troubleshooting

**LM Studio not responding?**
```bash
# Ensure LM Studio is running and API is enabled
# Check http://localhost:1234/v1/models
```

**TTS not working?**
```bash
# Verify ONNX models are in place
ls onnx_models/english_2026-04/

# Check HF token has access to model repo
```

**OpenCode not working?**
```bash
opencode auth
```

## 📈 Roadmap

- [x] Voice I/O with Web Speech API
- [x] Custom TTS with voice cloning
- [x] 3D particle visualization
- [x] Process log for real-time status
- [ ] Conversation history persistence
- [ ] Home automation integration
- [ ] Multi-language support
- [ ] Custom wake word detection

## 📄 License

MIT License © 2025 [Tejas Das](https://github.com/itej13)

## 🙏 Acknowledgments

- [LM Studio](https://lmstudio.ai) - Local LLM execution
- [OpenCode](https://opencode.ai) - Code execution
- [Pocket TTS](https://github.com/kyutai-labs/moshi) - ONNX TTS
- [Three.js](https://threejs.org) - 3D visualization

---

<p align="center">
  <strong>“At your service, Sir.”</strong> — J.A.R.V.I.S.
</p>