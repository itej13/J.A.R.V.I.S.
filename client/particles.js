const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height, centerX, centerY, blobRadius;
let audioContext, analyser, dataArray;
let micActive = false;
let currentIntensity = 0;
let particles = [];
let sphereRadius;
let rotationY = 0;
let rotationX = 0;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  centerX = width / 2;
  centerY = height / 2;
  blobRadius = Math.min(width, height) / 3 * 0.9;
  sphereRadius = blobRadius * 0.9;
  initParticles();
}

function initParticles() {
  particles = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  const count = 400;
  
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    particles.push({
      baseX: Math.cos(theta) * r,
      baseY: y,
      baseZ: Math.sin(theta) * r
    });
  }
}

async function initMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (stream.getAudioTracks().length === 0) {
      console.log('No audio track');
      return;
    }
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    window.audioContext = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    micActive = true;
    window.micActive = true;
    console.log('Mic active');
  } catch (e) {
    console.log('Mic error:', e.message);
  }
}

function getMicIntensity() {
  if (!micActive || !analyser) return 0;
  analyser.getByteFrequencyData(dataArray);
  let max = 0;
  for (let i = 0; i < dataArray.length; i++) {
    if (dataArray[i] > max) max = dataArray[i];
  }
  return max / 255;
}

function rotatePoint(x, y, z, angleY, angleX) {
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  
  let x1 = x * cosY - z * sinY;
  let z1 = x * sinY + z * cosY;
  let y1 = y;
  
  let y2 = y1 * cosX - z1 * sinX;
  let z2 = y1 * sinX + z1 * cosX;
  
  return { x: x1, y: y2, z: z2 };
}

function getGradientColor(t) {
  const r = Math.round(t * 30);
  const g = Math.round(30 + t * 130);
  const b = Math.round(100 + t * 155);
  return { r, g, b };
}

function render() {
  const intensity = getMicIntensity();
  currentIntensity += (intensity - currentIntensity) * 0.15;
  
  rotationY += 0.003;
  rotationX += 0.001;
  
  const scale = 1 + currentIntensity * 1;
  const sizeMult = 1 + currentIntensity * 0.5;
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  const renderRadius = sphereRadius * scale;
  
  for (const p of particles) {
    const rotated = rotatePoint(p.baseX, p.baseY, p.baseZ, rotationY, rotationX);
    const x = centerX + rotated.x * renderRadius;
    const y = centerY + rotated.y * renderRadius;
    const z = (rotated.z + 1) / 2;
    
    const color = getGradientColor(z);
    const size = (0.8 + z * 0.6) * sizeMult;
    const alpha = 0.5 + z * 0.5;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    ctx.fill();
  }
  
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'audioLevel', value: currentIntensity }, '*');
  }
  
  if (currentIntensity > 0.15) {
    window.dispatchEvent(new CustomEvent('listening', { detail: true }));
  }
  
  requestAnimationFrame(render);
}

window.addEventListener('resize', resize);
resize();

document.addEventListener('click', () => {
  if (!micActive) initMicrophone();
  else if (audioContext?.state === 'suspended') audioContext.resume();
});

window.startMic = function() {
  initMicrophone();
};

render();