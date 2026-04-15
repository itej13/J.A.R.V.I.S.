import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5.5;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  2.2, 0.5, 0.15
);
composer.addPass(bloom);

const holoGroup = new THREE.Group();
scene.add(holoGroup);

const COLORS = {
  core: 0xffffff,
  inner: 0xffdd88,
  mid: 0xff8844,
  outer: 0xff5500,
  ember: 0xaa2200
};

function createRing(radius, thickness, opacity, color, thetaStart = 0, thetaLength = Math.PI * 2) {
  const geometry = new THREE.RingGeometry(radius - thickness, radius, 80, 1, thetaStart, thetaLength);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  return new THREE.Mesh(geometry, material);
}

function createFragmentedRing(radius, thickness, opacity, color, segments, gapFraction, zOffset = 0) {
  const group = new THREE.Group();
  group.position.z = zOffset;
  const segmentAngle = (Math.PI * 2) / segments;
  const gapAngle = segmentAngle * gapFraction;
  const arcLength = segmentAngle - gapAngle;
  
  for (let i = 0; i < segments; i++) {
    const startAngle = i * segmentAngle + gapAngle / 2;
    const ring = createRing(radius, thickness, opacity * (0.4 + Math.random() * 0.6), color, startAngle, arcLength);
    ring.userData.baseOpacity = ring.material.opacity;
    ring.userData.phaseOffset = Math.random() * Math.PI * 2;
    ring.position.z = zOffset + (Math.random() - 0.5) * 0.05;
    group.add(ring);
  }
  return group;
}

function createOrbitalArc(radius, thickness, opacity, color, arcLength, zOffset = 0) {
  const group = new THREE.Group();
  const numArcs = 3;
  for (let i = 0; i < numArcs; i++) {
    const startAngle = (i / numArcs) * Math.PI * 2 + Math.random() * 0.5;
    const ring = createRing(radius, thickness, opacity * (0.3 + Math.random() * 0.5), color, startAngle, arcLength);
    ring.position.z = zOffset + (Math.random() - 0.5) * 0.08;
    ring.userData.baseOpacity = ring.material.opacity;
    group.add(ring);
  }
  return group;
}

function createRadialSpokes(radius, count, length, color, opacity, zOffset = 0) {
  const group = new THREE.Group();
  group.position.z = zOffset;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
    const geometry = new THREE.BufferGeometry();
    const innerR = radius - length * (0.2 + Math.random() * 0.3);
    const outerR = radius + length * (0.1 + Math.random() * 0.4);
    const points = [
      new THREE.Vector3(Math.cos(angle) * innerR, Math.sin(angle) * innerR, 0),
      new THREE.Vector3(Math.cos(angle) * outerR, Math.sin(angle) * outerR, 0)
    ];
    geometry.setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity * (0.2 + Math.random() * 0.6),
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geometry, material);
    line.userData.baseOpacity = material.opacity;
    group.add(line);
  }
  return group;
}

function createSpiralFilament(radius, turns, color, opacity, zOffset = 0) {
  const group = new THREE.Group();
  group.position.z = zOffset;
  const points = [];
  const segments = 120;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * turns * Math.PI * 2;
    const r = radius * (0.7 + t * 0.4);
    points.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, (t - 0.5) * 0.1));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity * 0.5,
    blending: THREE.AdditiveBlending
  });
  group.add(new THREE.Line(geometry, material));
  return group;
}

function createScanlineFilaments(radius, count, color, opacity, zOffset = 0) {
  const group = new THREE.Group();
  group.position.z = zOffset;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * (0.8 + Math.random() * 0.35);
    const length = 0.08 + Math.random() * 0.15;
    const z = (Math.random() - 0.5) * 0.2;
    const geometry = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, z),
      new THREE.Vector3(Math.cos(angle) * (r + length), Math.sin(angle) * (r + length), z + (Math.random() - 0.5) * 0.05)
    ];
    geometry.setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity * (0.15 + Math.random() * 0.45),
      blending: THREE.AdditiveBlending
    });
    group.add(new THREE.Line(geometry, material));
  }
  return group;
}

function createEnergyLattice(radius, color, opacity, zOffset = 0) {
  const group = new THREE.Group();
  group.position.z = zOffset;
  const rings = 3;
  for (let r = 0; r < rings; r++) {
    const radiusOffset = r * 0.15;
    const ring = createFragmentedRing(
      radius + radiusOffset,
      0.004,
      opacity * (0.3 + r * 0.2),
      color,
      12 + r * 4,
      0.5 + r * 0.1
    );
    ring.rotation.z = r * 0.3;
    ring.children.forEach(child => {
      child.position.z = (Math.random() - 0.5) * 0.03;
    });
    group.add(ring);
  }
  return group;
}

const layers = {
  core: null,
  innerGlow: null,
  innerRings: null,
  midRings: null,
  outerRings: null,
  lattice: null,
  outer: null,
  background: null
};

const coreCanvas = document.createElement('canvas');
coreCanvas.width = 512;
coreCanvas.height = 512;
const coreCtx = coreCanvas.getContext('2d');
const gradient = coreCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
gradient.addColorStop(0, '#ffffff');
gradient.addColorStop(0.15, '#ffeecc');
gradient.addColorStop(0.35, '#ffaa44');
gradient.addColorStop(0.6, '#ff6600');
gradient.addColorStop(1, 'transparent');
coreCtx.fillStyle = gradient;
coreCtx.fillRect(0, 0, 512, 512);
const coreTexture = new THREE.CanvasTexture(coreCanvas);
const coreMaterial = new THREE.SpriteMaterial({ 
  map: coreTexture, 
  blending: THREE.AdditiveBlending,
  transparent: true,
  opacity: 1.0
});
layers.core = new THREE.Sprite(coreMaterial);
layers.core.scale.set(0.5, 0.5, 1);
holoGroup.add(layers.core);

const emberCount = 2500;
const emberPositions = new Float32Array(emberCount * 3);
const emberOriginalPositions = new Float32Array(emberCount * 3);
for (let i = 0; i < emberCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 0.35 * Math.pow(Math.random(), 0.5);
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  emberPositions[i * 3] = x;
  emberPositions[i * 3 + 1] = y;
  emberPositions[i * 3 + 2] = z;
  emberOriginalPositions[i * 3] = x;
  emberOriginalPositions[i * 3 + 1] = y;
  emberOriginalPositions[i * 3 + 2] = z;
}
const emberGeom = new THREE.BufferGeometry();
emberGeom.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
const emberMat = new THREE.PointsMaterial({
  color: COLORS.inner,
  size: 0.018,
  transparent: true,
  opacity: 0.7,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true
});
layers.innerGlow = new THREE.Points(emberGeom, emberMat);
holoGroup.add(layers.innerGlow);

layers.innerRings = new THREE.Group();
const ir1 = createFragmentedRing(0.4, 0.012, 0.9, COLORS.inner, 4, 0.35, -0.05);
const ir2 = createFragmentedRing(0.45, 0.008, 0.7, COLORS.mid, 5, 0.4, 0.05);
const ir3 = createFragmentedRing(0.5, 0.01, 0.6, COLORS.outer, 6, 0.45, -0.03);
ir1.userData.rotationSpeed = 0.2;
ir2.userData.rotationSpeed = -0.15;
ir3.userData.rotationSpeed = 0.12;
layers.innerRings.add(ir1, ir2, ir3);
holoGroup.add(layers.innerRings);

layers.midRings = new THREE.Group();
const mr1 = createFragmentedRing(0.7, 0.015, 0.85, COLORS.mid, 5, 0.3, -0.08);
const mr2 = createFragmentedRing(0.8, 0.01, 0.65, COLORS.outer, 6, 0.35, 0.06);
const mr3 = createOrbitalArc(0.75, 0.006, 0.5, COLORS.mid, Math.PI * 0.6, 0);
const mr4 = createRadialSpokes(0.75, 16, 0.18, COLORS.mid, 0.6, 0);
mr1.userData.rotationSpeed = 0.1;
mr2.userData.rotationSpeed = -0.08;
mr3.userData.rotationSpeed = 0.05;
mr4.userData.rotationSpeed = 0.03;
layers.midRings.add(mr1, mr2, mr3, mr4);
holoGroup.add(layers.midRings);

layers.outerRings = new THREE.Group();
const or1 = createFragmentedRing(1.1, 0.018, 0.8, COLORS.outer, 6, 0.32, -0.1);
const or2 = createFragmentedRing(1.2, 0.012, 0.6, COLORS.mid, 7, 0.38, 0.08);
const or3 = createOrbitalArc(1.15, 0.008, 0.5, COLORS.inner, Math.PI * 0.5, 0);
const or4 = createRadialSpokes(1.15, 24, 0.25, COLORS.outer, 0.5, 0);
or1.userData.rotationSpeed = 0.06;
or2.userData.rotationSpeed = -0.05;
or3.userData.rotationSpeed = 0.03;
or4.userData.rotationSpeed = 0.015;
layers.outerRings.add(or1, or2, or3, or4);
holoGroup.add(layers.outerRings);

layers.lattice = new THREE.Group();
const l1 = createEnergyLattice(1.5, COLORS.outer, 0.4, -0.05);
const l2 = createEnergyLattice(1.6, COLORS.mid, 0.35, 0.05);
const l3 = createSpiralFilament(1.4, 2, COLORS.mid, 0.3, 0);
l1.userData.rotationSpeed = 0.02;
l2.userData.rotationSpeed = -0.015;
l3.userData.rotationSpeed = 0.01;
layers.lattice.add(l1, l2, l3);
holoGroup.add(layers.lattice);

layers.outer = new THREE.Group();
const outerRing1 = createFragmentedRing(1.85, 0.022, 0.95, COLORS.outer, 8, 0.3, -0.12);
const outerRing2 = createFragmentedRing(1.95, 0.016, 0.75, COLORS.mid, 10, 0.35, 0.1);
const outerRing3 = createFragmentedRing(2.05, 0.012, 0.55, COLORS.inner, 12, 0.4, -0.05);
const outerSpokes = createRadialSpokes(1.95, 32, 0.3, COLORS.outer, 0.4, 0);
const outerScanlines = createScanlineFilaments(1.95, 60, COLORS.ember, 0.35, 0);

outerRing1.userData.rotationSpeed = 0.035;
outerRing2.userData.rotationSpeed = -0.025;
outerRing3.userData.rotationSpeed = 0.018;
outerSpokes.userData.rotationSpeed = 0.008;
outerScanlines.userData.rotationSpeed = 0.004;

layers.outer.add(outerRing1, outerRing2, outerRing3, outerSpokes, outerScanlines);
holoGroup.add(layers.outer);

const bgParticleCount = 600;
const bgPositions = new Float32Array(bgParticleCount * 3);
for (let i = 0; i < bgParticleCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 4 + Math.random() * 3;
  bgPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  bgPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  bgPositions[i * 3 + 2] = r * Math.cos(phi) - 4;
}
const bgGeom = new THREE.BufferGeometry();
bgGeom.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
const bgMat = new THREE.PointsMaterial({
  color: COLORS.ember,
  size: 0.025,
  transparent: true,
  opacity: 0.25,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
layers.background = new THREE.Points(bgGeom, bgMat);
scene.add(layers.background);

let analyser = null;
let audioContext = null;
let micStream = null;

async function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
  } catch (e) {
    console.log('Microphone not available');
  }
}

function getAudioLevel() {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum / data.length / 255;
}

let smoothAudio = 0;
let clock = 0;

function tick() {
  requestAnimationFrame(tick);
  const delta = 0.016;
  clock += delta;
  
  const rawAudio = getAudioLevel();
  smoothAudio += (rawAudio - smoothAudio) * 0.06;
  
  const audioNorm = Math.min(smoothAudio / 0.25, 1);
  
  const pulseScale = 1 + Math.sin(clock * 2) * 0.015;
  const outerScale = 1 + audioNorm * 0.06;
  layers.outer.scale.setScalar(outerScale * pulseScale);
  
  const baseRotation = clock * 0.06;
  holoGroup.rotation.y = baseRotation;
  holoGroup.rotation.x = Math.sin(clock * 0.3) * 0.05;
  holoGroup.rotation.z = Math.cos(clock * 0.25) * 0.03;
  
  const rotateLayer = (layer, speed) => {
    if (layer && layer.children) {
      layer.children.forEach(child => {
        if (child.userData && child.userData.rotationSpeed) {
          child.rotation.z += child.userData.rotationSpeed * delta;
        } else if (child.children) {
          child.children.forEach(sub => {
            if (sub.userData && sub.userData.rotationSpeed) {
              sub.rotation.z += sub.userData.rotationSpeed * delta;
            }
          });
        }
      });
    }
  };
  
  rotateLayer(layers.innerRings, 1);
  rotateLayer(layers.midRings, 1);
  rotateLayer(layers.outerRings, 1);
  rotateLayer(layers.lattice, 1);
  rotateLayer(layers.outer, 1);
  
  const pulse = 0.65 + Math.sin(clock * 3.5) * 0.2;
  const pulseOuter = 0.7 + Math.sin(clock * 4) * 0.15;
  
  const applyPulse = (layer, basePulse) => {
    if (layer && layer.children) {
      layer.children.forEach(child => {
        if (child.material && child.material.opacity !== undefined) {
          if (child.userData && child.userData.baseOpacity) {
            child.material.opacity = child.userData.baseOpacity * basePulse * (0.85 + Math.sin(clock * 2.5 + child.userData.phaseOffset) * 0.15);
          }
        }
        if (child.children) {
          child.children.forEach(sub => {
            if (sub.material && sub.userData && sub.userData.baseOpacity) {
              sub.material.opacity = sub.userData.baseOpacity * basePulse * (0.85 + Math.sin(clock * 2 + sub.userData.phaseOffset) * 0.15);
            }
          });
        }
      });
    }
  };
  
  applyPulse(layers.innerRings, pulse);
  applyPulse(layers.midRings, pulse);
  applyPulse(layers.outerRings, pulse);
  applyPulse(layers.lattice, pulse * 0.9);
  applyPulse(layers.outer, pulseOuter);
  
  if (layers.core.material) {
    layers.core.material.opacity = 0.95 + Math.sin(clock * 5) * 0.05;
  }
  
  const emberPos = layers.innerGlow.geometry.attributes.position.array;
  for (let i = 0; i < emberCount; i++) {
    const idx = i * 3;
    const t = clock + i * 0.05;
    const ox = emberOriginalPositions[idx];
    const oy = emberOriginalPositions[idx + 1];
    const oz = emberOriginalPositions[idx + 2];
    emberPos[idx] = ox + Math.sin(t) * 0.002;
    emberPos[idx + 1] = oy + Math.cos(t * 0.8) * 0.002;
    emberPos[idx + 2] = oz + Math.sin(t * 0.9) * 0.001;
  }
  layers.innerGlow.geometry.attributes.position.needsUpdate = true;
  
  bloom.strength = 2.2 + audioNorm * 0.6;
  
  composer.render();
}

initAudio();

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

tick();

const state = {
  current: 'idle',
  set(newState) {
    this.current = newState;
    updateState(newState);
  }
};

function updateState(newState) {
  const statusText = document.getElementById('statusText');
  if (!statusText) return;
  
  const states = {
    idle: { text: 'STANDBY', class: '' },
    listening: { text: 'LISTENING', class: 'listening' },
    processing: { text: 'PROCESSING', class: 'processing' },
    speaking: { text: 'SPEAKING', class: 'speaking' },
    executing: { text: 'EXECUTING', class: 'executing' }
  };
  
  statusText.textContent = states[newState]?.text || 'STANDBY';
}

let speechSynth = null;
let currentVoice = null;
let speechEnabled = true;
let speechRate = 1.0;
let speechPitch = 1.0;

function initSpeech() {
  speechSynth = window.speechSynthesis;
  loadVoices();
  if (speechSynth.onvoiceschanged !== undefined) {
    speechSynth.onvoiceschanged = loadVoices;
  }
}

function loadVoices() {
  const voices = speechSynth.getVoices();
  currentVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
}

function speakText(text) {
  if (!speechSynth || !speechEnabled) return;
  
  speechSynth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = currentVoice;
  utterance.rate = speechRate;
  utterance.pitch = speechPitch;
  
  utterance.onstart = () => state.set('speaking');
  utterance.onend = () => state.set('idle');
  utterance.onerror = () => state.set('idle');
  
  speechSynth.speak(utterance);
}

function stopSpeaking() {
  if (speechSynth) speechSynth.cancel();
}

const activityLines = [];
function addActivityLine(text) {
  activityLines.push(text);
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  
  const line = document.createElement('div');
  line.className = 'activity-line';
  line.textContent = text;
  feed.appendChild(line);
  feed.scrollTop = feed.scrollHeight;
}

function clearActivityFeed() {
  activityLines.length = 0;
  const feed = document.getElementById('activityFeed');
  if (feed) feed.innerHTML = '';
}

const chatMessages = [];
function addMessage(role, text) {
  chatMessages.push({ role, text });
  
  const container = document.getElementById('chatMessages');
  if (!container) return;
  
  const msg = document.createElement('div');
  msg.className = `chat-message ${role}`;
  msg.innerHTML = `<span class="message-label">${role === 'user' ? '[SIR]' : '[JARVIS]'}</span><span class="message-text">${text}</span>`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

let pendingToolCalls = [];
let isStreamingChat = false;
let isSendingMessage = false;

async function sendMessage(text) {
  if (!text.trim() || isSendingMessage) return;
  
  isSendingMessage = true;
  
  addMessage('user', text);
  state.set('processing');
  setInputEnabled(false);
  
  isStreamingChat = true;
  pendingToolCalls = [];
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    
    if (!response.ok) {
      const err = await response.json();
      addMessage('assistant', err.error || 'An error occurred, Sir.');
      speakText(err.error || 'An error occurred, Sir.');
      state.set('idle');
      return;
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantText = '';
    let jarvisResponse = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        
        try {
          const event = JSON.parse(data);
          
          if (event.type === 'delta') {
            assistantText += event.content;
            jarvisResponse += event.content;
            
            const container = document.getElementById('chatMessages');
            if (container) {
              let lastMsg = container.querySelector('.chat-message.assistant:last-child');
              if (!lastMsg) {
                lastMsg = document.createElement('div');
                lastMsg.className = 'chat-message assistant';
                lastMsg.innerHTML = '<span class="message-label">[JARVIS]</span><span class="message-text"></span>';
                container.appendChild(lastMsg);
              }
              lastMsg.querySelector('.message-text').textContent = assistantText;
              container.scrollTop = container.scrollHeight;
            }
            
            const sentenceEnd = /[.!?\n]/;
            if (sentenceEnd.test(event.content) && speechEnabled) {
              const sentences = jarvisResponse.match(/[^.!?\n]+[.!?\n]?/g) || [];
              if (sentences.length > 1) {
                const toSpeak = sentences.slice(0, -1).join('').trim();
                if (toSpeak) {
                  speakText(toSpeak);
                  jarvisResponse = sentences[sentences.length - 1];
                }
              }
            }
          }
          else if (event.type === 'tool_call') {
            pendingToolCalls.push(event);
            state.set('executing');
          }
          else if (event.type === 'done') {
            isStreamingChat = false;
            if (jarvisResponse.trim() && speechEnabled) {
              speakText(jarvisResponse.trim());
            }
            setInputEnabled(true);
            state.set('idle');
          }
          else if (event.type === 'error') {
            addMessage('assistant', event.content);
            speakText(event.content);
            setInputEnabled(true);
            state.set('idle');
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      }
    }
  } catch (err) {
    addMessage('assistant', "I've lost my connection, Sir.");
    speakText("I've lost my connection, Sir.");
    state.set('idle');
    isSendingMessage = false;
  }
  
  if (pendingToolCalls.length > 0) {
    await handleToolCalls(pendingToolCalls);
  }
  
  isSendingMessage = false;
}

async function handleToolCalls(toolCalls) {
  for (const toolCall of toolCalls) {
    const { id, name, arguments: args } = toolCall;
    addActivityLine(`Executing tool: ${name}`);
    
    let result;
    try {
      result = await executeTool(name, args);
    } catch (err) {
      result = `Error: ${err.message}`;
    }
    
    addActivityLine(`Result: ${typeof result === 'string' ? result : JSON.stringify(result)}`);
    
    const response = await fetch('/api/chat/tool-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_call_id: id, name, result })
    });
    
    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let followUpText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          
          try {
            const event = JSON.parse(data);
            if (event.type === 'delta') {
              followUpText += event.content;
              
              const container = document.getElementById('chatMessages');
              if (container) {
                let lastMsg = container.querySelector('.chat-message.assistant:last-child');
                if (!lastMsg) {
                  lastMsg = document.createElement('div');
                  lastMsg.className = 'chat-message assistant';
                  lastMsg.innerHTML = '<span class="message-label">[JARVIS]</span><span class="message-text"></span>';
                  container.appendChild(lastMsg);
                }
                lastMsg.querySelector('.message-text').textContent = followUpText;
                container.scrollTop = container.scrollHeight;
              }
            }
            else if (event.type === 'done') {
              if (followUpText.trim() && speechEnabled) {
                speakText(followUpText.trim());
              }
              state.set('idle');
            }
            else if (event.type === 'error') {
              addMessage('assistant', event.content);
              speakText(event.content);
              state.set('idle');
            }
          } catch (e) {}
        }
      }
    }
  }
  
  pendingToolCalls = [];
}

async function executeTool(name, args) {
  switch (name) {
    case 'execute_code': {
      clearActivityFeed();
      addActivityLine('Starting OpenCode...');
      
      const execRes = await fetch('/api/claude-code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: args.task, workingDirectory: args.working_directory })
      });
      
      if (!execRes.ok) {
        const err = await execRes.json();
        return err.error || 'OpenCode CLI not found. Please install: npm install -g opencode';
      }
      
      const { sessionId } = await execRes.json();
      
      const streamRes = await fetch(`/api/claude-code/stream/${sessionId}`);
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          
          try {
            const event = JSON.parse(data);
            if (event.content) {
              addActivityLine(event.content);
            }
            if (event.type === 'done') {
              return 'OpenCode completed successfully.';
            }
          } catch (e) {
            if (line.trim()) addActivityLine(line);
          }
        }
      }
      
      return 'OpenCode completed.';
    }
    
    case 'get_time_date': {
      const res = await fetch('/api/tools/time');
      const data = await res.json();
      return `Current time: ${data.time}, ${data.date} (${data.timezone})`;
    }
    
    case 'calculate': {
      const res = await fetch('/api/tools/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: args.expression })
      });
      const data = await res.json();
      if (data.error) return `Error: ${data.error}`;
      return `Result: ${data.result}`;
    }
    
    case 'get_weather': {
      const res = await fetch(`/api/tools/weather?city=${encodeURIComponent(args.city)}`);
      const data = await res.json();
      if (data.error) return `Error: ${data.error}`;
      return `Weather in ${data.city}: ${data.temp}°C, ${data.description}`;
    }
    
    case 'open_url': {
      window.open(args.url, '_blank');
      return `Opened ${args.url}`;
    }
    
    case 'read_clipboard': {
      try {
        const text = await navigator.clipboard.readText();
        return text || 'Clipboard is empty';
      } catch {
        return 'Error: Could not read clipboard';
      }
    }
    
    case 'list_directory': {
      const res = await fetch('/api/tools/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: args.path })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const dirs = data.filter(f => f.isDirectory).map(f => f.name);
        const files = data.filter(f => !f.isDirectory).map(f => f.name);
        return `Directories: ${dirs.join(', ') || 'none'}\nFiles: ${files.join(', ') || 'none'}`;
      }
      return `Error: ${data.error || 'Unknown error'}`;
    }
    
    case 'set_timer': {
      const res = await fetch('/api/tools/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: args.seconds, message: args.message })
      });
      if (res.ok) {
        setTimeout(() => {
          if (speechEnabled) {
            speakText(args.message);
          }
        }, args.seconds * 1000);
        return `Timer set for ${args.seconds} seconds`;
      }
      return 'Error setting timer';
    }
    
    default:
      return `Unknown tool: ${name}`;
  }
}

let recognition = null;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.log('Speech recognition not supported');
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.minimumConfidence = 0.5;
  
  let wakeWordActive = false;
  
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    
    const input = document.getElementById('textInput');
    if (input) input.value = transcript;
    
    if (!wakeWordActive && event.results[0].isFinal) {
      const lower = transcript.toLowerCase();
      if (lower.includes('hey jarvis') || lower.includes('jarvis')) {
        wakeWordActive = true;
        setTimeout(() => { wakeWordActive = false; }, 2000);
        startListening();
      }
    }
  };
  
  recognition.onstart = () => {
    state.set('listening');
  };
  
  recognition.onend = () => {
    if (state.current === 'listening') {
      state.set('idle');
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    state.set('idle');
  };
  
  recognition.start();
}

function startListening() {
  if (!recognition) {
    initSpeechRecognition();
  }
  if (recognition) {
    try {
      recognition.start();
    } catch (e) {
      console.log('Already listening');
    }
  }
  state.set('listening');
}

function stopListening() {
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {}
  }
  state.set('idle');
  
  const input = document.getElementById('textInput');
  if (input && input.value.trim()) {
    sendMessage(input.value);
    input.value = '';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat && document.activeElement !== document.getElementById('textInput')) {
    e.preventDefault();
    startListening();
  }
  if (e.code === 'Escape') {
    stopSpeaking();
    stopListening();
    state.set('idle');
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && document.activeElement !== document.getElementById('textInput')) {
    e.preventDefault();
    stopListening();
  }
});

const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');

function setInputEnabled(enabled) {
  if (textInput) textInput.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

if (textInput) {
  textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && textInput.value.trim() && !isSendingMessage) {
      sendMessage(textInput.value);
      textInput.value = '';
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    if (textInput && textInput.value.trim() && !isSendingMessage) {
      sendMessage(textInput.value);
      textInput.value = '';
    }
  });
}

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', resetConversation);
}

async function resetConversation() {
  try {
    await fetch('/api/chat/reset', { method: 'POST' });
    
    const chatContainer = document.getElementById('chatMessages');
    if (chatContainer) chatContainer.innerHTML = '';
    chatMessages.length = 0;
    
    clearActivityFeed();
    addMessage('assistant', 'Conversation reset, Sir. How may I assist you?');
  } catch (err) {
    console.error('Reset failed:', err);
  }
}

initSpeech();
initSpeechRecognition();