const statusText = document.getElementById('statusText');
const weatherTemp = document.getElementById('weatherTemp');
const weatherDesc = document.getElementById('weatherDesc');
const micBtn = document.getElementById('micBtn');
const processText = document.getElementById('processText');

let isListening = false;
let listeningTimeout;
let lastAudioTime = 0;
let recognition = null;
let isProcessing = false;

function updateStatus(text) {
  statusText.textContent = text;
}

function updateProcess(text) {
  processText.textContent = text;
}

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    updateStatus('LISTENING...');
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript.trim()) {
      updateStatus('PROCESSING...');
      await handleUserMessage(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    updateStatus('IDLE');
    micBtn.classList.remove('active');
  };

  recognition.onend = () => {
    if (!isProcessing) {
      updateStatus('IDLE');
      micBtn.classList.remove('active');
    }
  };
}

async function handleUserMessage(message) {
  isProcessing = true;
  updateStatus('THINKING...');
  updateProcess('Receiving input, Sir. Processing...');
  
  try {
    updateProcess('Sending to LM Studio, Sir. Awaiting response...');
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';

    updateProcess('LM Studio is processing your request, Sir. Receiving response...');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta' && data.content) {
              assistantMessage += data.content;
            } else if (data.type === 'tool_call') {
              updateProcess('Executing code, Sir. Please wait...');
            } else if (data.type === 'tool_done') {
              updateProcess('Code execution complete, Sir. Processing results...');
            } else if (data.type === 'done') {
              break;
            }
          } catch {}
        }
      }
    }

    if (assistantMessage.trim()) {
      updateStatus('SPEAKING...');
      speak(assistantMessage);
    } else {
      updateStatus('IDLE');
    }
  } catch (e) {
    console.error('Chat error:', e);
    updateStatus('ERROR');
  }
  
  isProcessing = false;
}

async function speak(text) {
  updateStatus('GENERATING VOICE...');
  updateProcess('Generating voice with your voice model, Sir...');
  
  try {
    const response = await fetch('/api/tts/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (response.ok) {
      updateProcess('Voice generated, Sir. Playing audio...');
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        updateStatus('IDLE');
        updateProcess('Task complete, Sir.');
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        updateStatus('IDLE');
        updateProcess('Audio playback error, Sir. Falling back...');
        fallbackSpeak(text);
      };
      
      await audio.play();
    } else {
      console.error('TTS failed, falling back to browser TTS');
      updateProcess('TTS failed, Sir. Using fallback...');
      fallbackSpeak(text);
    }
  } catch (e) {
    console.error('TTS error:', e);
    updateProcess('TTS error, Sir: ' + e.message);
    fallbackSpeak(text);
  }
}

function fallbackSpeak(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onend = () => updateStatus('IDLE');
    speechSynthesis.speak(utterance);
  } else {
    updateStatus('IDLE');
  }
}

micBtn.addEventListener('click', () => {
  if (window.micActive) {
    if (window.audioContext) {
      window.audioContext.close();
    }
    window.micActive = false;
    window.micIntensity = 0;
    micBtn.textContent = 'ACTIVATE';
    micBtn.classList.remove('active');
    updateStatus('IDLE');
  } else {
    if (recognition) {
      window.startMic();
      setTimeout(() => {
        if (window.micActive) {
          micBtn.textContent = 'SPEAK';
          micBtn.classList.add('active');
          recognition.start();
        }
      }, 500);
    } else {
      window.startMic();
      setTimeout(() => {
        if (window.micActive) {
          micBtn.textContent = 'LISTENING';
          micBtn.classList.add('active');
        }
      }, 500);
    }
  }
});

window.addEventListener('listening', () => {
  const now = Date.now();
  if (now - lastAudioTime > 500) {
    lastAudioTime = now;
    setListening(true);
  }
});

function updateWeather(temp, desc) {
  weatherTemp.textContent = temp;
  weatherDesc.textContent = desc;
}

async function fetchWeather() {
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m,weather_code');
    const data = await response.json();
    const temp = Math.round(data.current.temperature_2m) + '°C';
    const code = data.current.weather_code;
    const desc = getWeatherDesc(code);
    updateWeather(temp, desc);
  } catch (e) {
    updateWeather('--°', 'UNAVAILABLE');
  }
}

function getWeatherDesc(code) {
  const codes = {
    0: 'CLEAR',
    1: 'CLOUDY',
    2: 'CLOUDY',
    3: 'CLOUDY',
    45: 'FOG',
    48: 'FOG',
    51: 'RAIN',
    53: 'RAIN',
    55: 'RAIN',
    61: 'RAIN',
    63: 'RAIN',
    65: 'RAIN',
    71: 'SNOW',
    73: 'SNOW',
    75: 'SNOW',
    80: 'STORM',
    81: 'STORM',
    82: 'STORM',
    95: 'STORM',
    96: 'STORM',
    99: 'STORM'
  };
  return codes[code] || 'UNKNOWN';
}

function setListening(state) {
  isListening = state;
  if (state) {
    updateStatus('LISTENING...');
    clearTimeout(listeningTimeout);
    listeningTimeout = setTimeout(() => {
      if (isListening) updateStatus('IDLE');
    }, 3000);
  } else {
    updateStatus('IDLE');
  }
}

window.addEventListener('message', (event) => {
  if (event.data.type === 'listening') {
    setListening(true);
  } else if (event.data.type === 'speaking') {
    setListening(false);
    updateStatus('SPEAKING...');
  }
});

setInterval(fetchWeather, 300000);
fetchWeather();
setListening(false);