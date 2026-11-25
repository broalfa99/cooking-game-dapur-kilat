// Dapur Kilat — audio: tiny WebAudio synth, no audio files.
// Every sound is generated with oscillators / filtered noise.

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(m) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null, delay = 0) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur, vol = 0.08, filterFreq = 1200, delay = 0) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

// One-shot effects, named for what they mean in the kitchen.
export const sfx = {
  click() { tone(660, 0.07, 'triangle', 0.08); },
  add() { tone(520, 0.08, 'triangle', 0.1); tone(780, 0.09, 'triangle', 0.08, null, 0.05); },
  sizzle() { noise(0.5, 0.06, 2600); },
  flip() { noise(0.12, 0.1, 900); tone(300, 0.1, 'square', 0.05, 520); },
  ready() { tone(880, 0.12, 'sine', 0.1); tone(1174, 0.16, 'sine', 0.1, null, 0.1); },
  ding() { tone(1568, 0.35, 'sine', 0.12); tone(2093, 0.5, 'sine', 0.08, null, 0.08); },
  coin() { tone(988, 0.09, 'square', 0.06); tone(1319, 0.18, 'square', 0.06, null, 0.07); },
  wrong() { tone(220, 0.22, 'sawtooth', 0.09, 140); },
  burn() { noise(0.4, 0.09, 500); tone(180, 0.3, 'sawtooth', 0.07, 90); },
  expire() { tone(392, 0.18, 'triangle', 0.1, 311); tone(311, 0.25, 'triangle', 0.1, 233, 0.15); },
  newOrder() { tone(523, 0.1, 'triangle', 0.09); tone(659, 0.1, 'triangle', 0.09, null, 0.09); },
  trash() { noise(0.18, 0.08, 700); },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, null, i * 0.12));
  },
  lose() {
    [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, null, i * 0.16));
  },
};

// A light background loop: soft "kitchen hum" ticks. Kept very quiet.
let musicTimer = null;
export function startMusic() {
  if (musicTimer) return;
  const notes = [262, 330, 392, 330, 294, 370, 440, 370];
  let i = 0;
  musicTimer = window.setInterval(() => {
    if (muted) return;
    tone(notes[i % notes.length], 0.5, 'sine', 0.018);
    if (i % 4 === 2) tone(notes[(i + 4) % notes.length] / 2, 0.6, 'sine', 0.014);
    i++;
  }, 420);
}
export function stopMusic() {
  if (musicTimer) { window.clearInterval(musicTimer); musicTimer = null; }
}
