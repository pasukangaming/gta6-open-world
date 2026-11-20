// Solara Bay — sound, made only from the Web Audio API.
// No audio files, no network: every effect is an oscillator or a noise
// buffer shaped by a gain envelope. The game calls these; nothing here
// touches the canvas or the world.

let ctx = null;
let muted = false;

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type, vol, slideTo) {
  const ac = audioCtx();
  if (!ac || muted) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
  gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur);
}

function noise(dur, vol, filterFreq) {
  const ac = audioCtx();
  if (!ac || muted) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq || 1200;
  const gain = ac.createGain();
  gain.gain.value = vol || 0.15;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
}

export const sounds = {
  unlock() { audioCtx(); },
  shoot() { noise(0.09, 0.2, 2600); tone(180, 0.08, 'square', 0.08, 60); },
  hit() { noise(0.15, 0.2, 700); tone(90, 0.15, 'sawtooth', 0.12, 45); },
  pickup() { tone(660, 0.09, 'sine', 0.14, 990); },
  horn() { tone(370, 0.18, 'sawtooth', 0.1, 370); tone(466, 0.18, 'sawtooth', 0.08, 466); },
  ui() { tone(520, 0.07, 'sine', 0.1, 780); },
  siren() { tone(700, 0.35, 'sine', 0.06, 950); },
  mission() {
    tone(523, 0.12, 'sine', 0.14);
    setTimeout(() => tone(659, 0.12, 'sine', 0.14), 110);
    setTimeout(() => tone(784, 0.22, 'sine', 0.14), 220);
  },
};

export function setMuted(value) { muted = !!value; }
export function isMuted() { return muted; }
