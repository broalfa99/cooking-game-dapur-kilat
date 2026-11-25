// Dapur Kilat — main: boot, game loop, deterministic screenshot presets.
// Shot presets (?shot=start|play|serve|end) stage a fixed scene so the
// screenshots show the game at its best, every time, with the same seed.

import { VIEW } from './config.js';
import { createState, startShift, update } from './state.js';
import { render } from './render.js';
import { buildBinRects, canvasPos, handleClick, handleKey } from './input.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.w;
canvas.height = VIEW.h;

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1');
const shot = params.get('shot') || '';

const state = createState(seed);
buildBinRects();
window.__state = state; // handy for play-testing in devtools

let last = performance.now();
let elapsed = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;
  if (!shot) update(state, dt);
  render(ctx, state, elapsed);
  requestAnimationFrame(frame);
}

function stageShot() {
  // Every preset runs the real game code (startShift / real state), then
  // freezes the frame: the screenshots are renders of the live game.
  if (shot === 'start') {
    state.screen = 'title';
  } else if (shot === 'play') {
    startShift(state);
    // A busy mid-shift: two orders, one patty cooking, one half-built burger.
    state.orders = state.orders.slice(0, 2);
    state.orders[0].patience = state.orders[0].patienceMax * 0.55;
    state.orders[1].patience = state.orders[1].patienceMax * 0.8;
    state.grill[0] = { state: 'raw', t: 4.2 };
    state.grill[1] = { state: 'raw', t: 6.8 }; // cooked, ready to take
    state.plate = ['bunBottom', 'patty', 'cheese']; // correct prefix of order 0
    state.score = 340;
    state.coins = 27;
    state.combo = 2;
    state.timeLeft = 47;
    state.elapsed = 73;
    state.message = null; // keep the grill + board unobstructed
    state.screen = 'playing';
  } else if (shot === 'serve') {
    startShift(state);
    // A finished burger, bell about to ring: the "plate ready to serve" shot.
    const order = state.orders[0];
    state.orders = [order];
    order.patience = order.patienceMax * 0.72;
    state.plate = [...order.recipe.build];
    state.score = 520;
    state.coins = 41;
    state.combo = 3;
    state.timeLeft = 61;
    state.elapsed = 59;
    state.bellRing = 0.5;
    state.message = null;
    state.screen = 'playing';
    sfx.ding();
  } else if (shot === 'end') {
    startShift(state);
    state.score = 940;
    state.coins = 76;
    state.served = 9;
    state.lost = 1;
    state.bestCombo = 4;
    state.combo = 4;
    state.stats = { perfect: 5, wrong: 1, burnt: 1 };
    state.timeLeft = 0;
    state.elapsed = 120;
    state.message = null;
    state.screen = 'over';
    state.overReason = 'Shift selesai!';
  }
  // Let one update tick settle particles, then freeze the loop's updates.
  update(state, 0.016);
  window.__shotReady = true;
}

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPos(canvas, e.clientX, e.clientY);
  handleClick(state, p.x, p.y);
});

window.addEventListener('keydown', (e) => {
  if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  handleKey(state, e.key);
});

document.getElementById('mute-btn').addEventListener('click', () => {
  state.muted = !state.muted;
  import('./audio.js').then((m) => m.setMuted(state.muted));
  document.getElementById('mute-btn').textContent = state.muted ? '🔇 Suara: Mati' : '🔊 Suara: Hidup';
});

if (shot) {
  stageShot();
  // Frozen scene: still render every frame (for the bell ring / steam),
  // but never advance the game clock.
  requestAnimationFrame(frame);
} else {
  requestAnimationFrame(frame);
}
