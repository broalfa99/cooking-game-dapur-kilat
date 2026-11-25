// Dapur Kilat — state: orders, grill, plate, score, and the rules that move them.

import {
  GRILL, GRILL_SLOTS, INGREDIENTS, ING_BY_ID, MAX_HEARTS, MAX_ORDERS, RECIPES,
  SCORE, SHIFT_SECONDS,
} from './config.js';
import { sfx } from './audio.js';

let orderSeq = 0;

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function newOrder(rng, difficulty = 1, avoid = []) {
  const pool = RECIPES.filter((r) => r.build.length <= 5 + Math.min(2, difficulty));
  let recipe = pool[Math.floor(rng() * pool.length)];
  // Prefer a different recipe from the ones already waiting.
  for (let tries = 0; tries < 5 && avoid.includes(recipe.id); tries++) {
    recipe = pool[Math.floor(rng() * pool.length)];
  }
  return {
    id: ++orderSeq,
    recipe,
    patience: recipe.patience,
    patienceMax: recipe.patience,
    born: Date.now(),
    state: 'waiting', // waiting | served | expired
  };
}

export function createState(seed = 1) {
  const rng = makeRng(seed);
  return {
    screen: 'title', // title | playing | paused | over
    seed,
    rng,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    coins: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    hearts: MAX_HEARTS,
    orders: [],
    grill: Array(GRILL_SLOTS).fill(null), // { state:'raw'|'cooked'|'burnt', t }
    plate: [], // ingredient ids, bottom to top
    spawnTimer: 1.2,
    difficulty: 1,
    floaters: [], // {x,y,text,color,life,vy}
    particles: [], // {x,y,vx,vy,life,color,size}
    shake: 0,
    bellRing: 0,
    trashFlash: 0,
    message: null, // {text, sub, life}
    stats: { perfect: 0, wrong: 0, burnt: 0 },
    muted: false,
    overReason: '',
  };
}

export function addFloater(state, x, y, text, color = '#fff') {
  state.floaters.push({ x, y, text, color, life: 1, vy: -46 });
  if (state.floaters.length > 24) state.floaters.shift();
}

export function burst(state, x, y, color, n = 14, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    state.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
      life: 0.7 + Math.random() * 0.5, max: 1.2, color,
      size: 3 + Math.random() * 5,
    });
  }
  if (state.particles.length > 220) state.particles.splice(0, state.particles.length - 220);
}

export function showMessage(state, text, sub = '') {
  state.message = { text, sub, life: 2.2 };
}

export function startShift(state) {
  state.screen = 'playing';
  state.timeLeft = SHIFT_SECONDS;
  state.elapsed = 0;
  state.score = 0;
  state.coins = 0;
  state.served = 0;
  state.lost = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.hearts = MAX_HEARTS;
  const first = newOrder(state.rng, 1);
  state.orders = [first, newOrder(state.rng, 1, [first.recipe.id])];
  state.grill = Array(GRILL_SLOTS).fill(null);
  state.plate = [];
  state.spawnTimer = 6;
  state.difficulty = 1;
  state.floaters = [];
  state.particles = [];
  state.overReason = '';
  showMessage(state, 'Shift dimulai!', 'Sajikan pesanan secepat mungkin');
  sfx.newOrder();
}

// --- Grill ---

export function grillPatty(state, slot) {
  if (state.screen !== 'playing') return false;
  if (state.grill[slot]) return false;
  state.grill[slot] = { state: 'raw', t: 0 };
  sfx.sizzle();
  return true;
}

export function grillStateAt(state, slot) {
  const g = state.grill[slot];
  if (!g) return 'empty';
  if (g.t >= GRILL.burnTime) return 'burnt';
  if (g.t >= GRILL.cookTime) return 'cooked';
  return 'raw';
}

// Click a grill slot: take a cooked patty onto the plate, or toss a burnt one.
export function takeFromGrill(state, slot) {
  const g = state.grill[slot];
  if (!g) return false;
  const s = grillStateAt(state, slot);
  if (s === 'raw') {
    // Flip it: a flip resets a little cook time, rewarding attention.
    g.t = Math.max(0, g.t - 1.5);
    sfx.flip();
    return true;
  }
  if (s === 'burnt') {
    state.grill[slot] = null;
    state.stats.burnt++;
    state.combo = 0;
    state.score = Math.max(0, state.score - SCORE.burnPenalty);
    addFloater(state, 500, 130, `-${SCORE.burnPenalty} gosong!`, '#ff7a59');
    sfx.burn();
    return true;
  }
  state.grill[slot] = null;
  addToPlate(state, 'patty', 500, 140);
  return true;
}

// --- Plate ---

export function nextNeeded(state) {
  // The plate must match ONE open order's build, in order. Find the order
  // the plate currently fits best (longest matching prefix).
  let best = null;
  let bestLen = -1;
  for (const o of state.orders) {
    if (o.state !== 'waiting') continue;
    const b = o.recipe.build;
    let len = 0;
    while (len < state.plate.length && len < b.length && state.plate[len] === b[len]) len++;
    const fits = len === state.plate.length;
    if (fits && len > bestLen) { best = o; bestLen = len; }
  }
  return best;
}

export function addToPlate(state, id, x = 500, y = 300, silent = false) {
  if (state.screen !== 'playing') return false;
  if (state.plate.length >= 8) return false;
  state.plate.push(id);
  if (!silent) {
    sfx.add();
    burst(state, x, y, ING_BY_ID[id].color, 8, 90);
  }
  return true;
}

export function addBinIngredient(state, id, x, y) {
  if (state.screen !== 'playing') return false;
  if (id === 'patty') {
    // Raw patty goes to the first free grill slot, not the plate.
    const slot = state.grill.findIndex((g) => g === null);
    if (slot === -1) {
      addFloater(state, x, y, 'Panggangan penuh!', '#ffb3a7');
      sfx.wrong();
      return false;
    }
    return grillPatty(state, slot);
  }
  return addToPlate(state, id, x, y);
}

export function clearPlate(state) {
  if (state.plate.length === 0) return false;
  state.plate = [];
  state.trashFlash = 0.6;
  sfx.trash();
  return true;
}

// --- Serving ---

export function plateMatches(state, order) {
  const b = order.recipe.build;
  if (state.plate.length !== b.length) return false;
  return b.every((id, i) => state.plate[i] === id);
}

export function servePlate(state) {
  if (state.screen !== 'playing') return false;
  if (state.plate.length === 0) {
    addFloater(state, 750, 160, 'Piring masih kosong!', '#ffb3a7');
    sfx.wrong();
    return false;
  }
  const order = state.orders.find((o) => o.state === 'waiting' && plateMatches(state, o));
  state.bellRing = 0.7;
  if (!order) {
    state.combo = 0;
    state.stats.wrong++;
    state.score = Math.max(0, state.score - SCORE.wrongPenalty);
    state.shake = 0.45;
    addFloater(state, 750, 160, `Salah resep! -${SCORE.wrongPenalty}`, '#ff7a59');
    sfx.wrong();
    return false;
  }
  const patienceRatio = order.patience / order.patienceMax;
  const bonus = Math.round(SCORE.patienceBonusMax * patienceRatio);
  const comboBonus = Math.min(SCORE.comboCap, state.combo * SCORE.comboStep);
  const gained = SCORE.serveBase + bonus + comboBonus;
  state.score += gained;
  state.coins += order.recipe.coins;
  state.served++;
  state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  if (patienceRatio > 0.6) state.stats.perfect++;
  order.state = 'served';
  state.orders = state.orders.filter((o) => o.state === 'waiting');
  state.plate = [];
  addFloater(state, 750, 150, `+${gained}`, '#ffd94d');
  if (comboBonus > 0) addFloater(state, 750, 185, `Combo x${state.combo}!`, '#7be495');
  burst(state, 750, 170, '#ffd94d', 22, 200);
  sfx.ding();
  sfx.coin();
  return true;
}

// --- Tick ---

export function update(state, dt) {
  if (state.screen !== 'playing') {
    tickFx(state, dt);
    return;
  }
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
  state.difficulty = 1 + Math.floor(state.elapsed / 30);

  // Grill cooks.
  state.grill.forEach((g) => { if (g) g.t += dt; });

  // Orders lose patience; expired orders cost a heart.
  for (const o of state.orders) {
    if (o.state !== 'waiting') continue;
    o.patience -= dt;
    if (o.patience <= 0) {
      o.state = 'expired';
      state.lost++;
      state.hearts--;
      state.combo = 0;
      state.shake = 0.4;
      addFloater(state, 160, 120, 'Pesanan hangus!', '#ff7a59');
      sfx.expire();
    }
  }
  state.orders = state.orders.filter((o) => o.state === 'waiting');

  // New orders arrive while there is room.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.orders.length < MAX_ORDERS) {
    const waitingIds = state.orders.map((o) => o.recipe.id);
    state.orders.push(newOrder(state.rng, state.difficulty, waitingIds));
    state.spawnTimer = 5 + state.rng() * 4;
    sfx.newOrder();
  }

  tickFx(state, dt);

  if (state.message) {
    state.message.life -= dt;
    if (state.message.life <= 0) state.message = null;
  }
  if (state.timeLeft <= 0 || state.hearts <= 0) {
    endShift(state, state.hearts <= 0 ? 'Semua hati hilang — pelanggan kecewa!' : 'Shift selesai!');
  }
}

function tickFx(state, dt) {
  for (const f of state.floaters) { f.life -= dt * 0.9; f.y += f.vy * dt; }
  state.floaters = state.floaters.filter((f) => f.life > 0);
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
  if (state.bellRing > 0) state.bellRing = Math.max(0, state.bellRing - dt);
  if (state.trashFlash > 0) state.trashFlash = Math.max(0, state.trashFlash - dt);
}

export function endShift(state, reason) {
  state.screen = 'over';
  state.overReason = reason;
  state.grill = state.grill.map(() => null);
  if (state.score >= 600) sfx.win();
  else sfx.lose();
}
