// Synthesized WebAudio sound only — no audio files, no network.
// Created on the first user gesture; every call is safe before that.
export function createAudio() {
  let ctx = null;
  function ensure() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    return ctx;
  }
  function tone(freq, dur, type, vol, slide) {
    const c = ensure(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
    } catch { /* audio is decoration */ }
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    shoot() { tone(900, 0.12, 'square', 0.07, 120); },
    coin() { tone(880, 0.12, 'sine', 0.08, 1320); },
    hit() { tone(160, 0.25, 'sawtooth', 0.1, 60); },
    siren() { tone(700, 0.4, 'sine', 0.05, 1100); },
    mission() { tone(523, 0.15, 'sine', 0.09); setTimeout(() => tone(659, 0.15, 'sine', 0.09), 140); setTimeout(() => tone(784, 0.3, 'sine', 0.09), 280); },
    steal() { tone(300, 0.2, 'square', 0.06, 600); },
  };
}
