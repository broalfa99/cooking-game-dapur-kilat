// Dapur Kilat — input: mouse clicks and keyboard, mapped to kitchen actions.

import { INGREDIENTS, LAYOUT } from './config.js';
import {
  addBinIngredient, clearPlate, grillPatty, grillStateAt, servePlate,
  startShift, takeFromGrill,
} from './state.js';
import { setMuted, sfx, startMusic } from './audio.js';

export const BIN_RECTS = [];
export const GRILL_RECTS = [];
export const CLICK_ZONES = {
  bell: null,
  trash: null,
  plate: null,
  start: null,
  restart: null,
};

function pointIn(r, x, y) {
  return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function buildBinRects() {
  BIN_RECTS.length = 0;
  const { x, y, w, h } = LAYOUT.bins;
  const n = INGREDIENTS.length;
  const gap = 10;
  const bw = (w - gap * (n - 1)) / n;
  INGREDIENTS.forEach((ing, i) => {
    BIN_RECTS.push({ ing, x: x + i * (bw + gap), y, w: bw, h });
  });
  GRILL_RECTS.length = 0;
  const g = LAYOUT.grill;
  GRILL_RECTS.push({ x: g.x + 16, y: g.y + 58, w: 128, h: 76 });
  GRILL_RECTS.push({ x: g.x + 156, y: g.y + 58, w: 128, h: 76 });
  CLICK_ZONES.bell = { x: LAYOUT.bell.x + 20, y: LAYOUT.bell.y + 30, w: 130, h: 105 };
  CLICK_ZONES.trash = { x: LAYOUT.trash.x + 8, y: LAYOUT.trash.y + 6, w: 154, h: 78 };
  CLICK_ZONES.plate = { x: LAYOUT.plate.x + 10, y: LAYOUT.plate.y + 10, w: 280, h: 170 };
  CLICK_ZONES.start = { x: 490, y: 480, w: 300, h: 64 };
  CLICK_ZONES.restart = { x: 490, y: 500, w: 300, h: 64 };
}

export function handleClick(state, x, y) {
  if (state.screen === 'title') {
    if (pointIn(CLICK_ZONES.start, x, y)) {
      sfx.click();
      startMusic();
      startShift(state);
    }
    return;
  }
  if (state.screen === 'over') {
    if (pointIn(CLICK_ZONES.restart, x, y)) {
      sfx.click();
      startShift(state);
    }
    return;
  }
  if (state.screen === 'paused') {
    if (pointIn(CLICK_ZONES.start, x, y)) {
      state.screen = 'playing';
      sfx.click();
    }
    return;
  }

  // Playing: ingredient bins first.
  for (const b of BIN_RECTS) {
    if (pointIn(b, x, y)) {
      addBinIngredient(state, b.ing.id, b.x + b.w / 2, b.y + 20);
      return;
    }
  }
  // Grill slots.
  for (let i = 0; i < GRILL_RECTS.length; i++) {
    if (pointIn(GRILL_RECTS[i], x, y)) {
      if (state.grill[i]) takeFromGrill(state, i);
      else grillPatty(state, i);
      return;
    }
  }
  if (pointIn(CLICK_ZONES.bell, x, y)) {
    servePlate(state);
    return;
  }
  if (pointIn(CLICK_ZONES.trash, x, y)) {
    if (clearPlate(state)) return;
    return;
  }
  if (pointIn(CLICK_ZONES.plate, x, y)) {
    // Tapping the plate nudges a hint floater about the next needed item.
    sfx.click();
  }
}

export function handleKey(state, key) {
  const k = key.toLowerCase();
  if (k === 'm') {
    state.muted = !state.muted;
    setMuted(state.muted);
    return;
  }
  if (state.screen === 'title' && (k === 'enter' || k === ' ')) {
    sfx.click();
    startMusic();
    startShift(state);
    return;
  }
  if (state.screen === 'over' && (k === 'enter' || k === 'r')) {
    sfx.click();
    startShift(state);
    return;
  }
  if (k === 'p' || k === 'escape') {
    if (state.screen === 'playing') { state.screen = 'paused'; sfx.click(); }
    else if (state.screen === 'paused') { state.screen = 'playing'; sfx.click(); }
    return;
  }
  if (state.screen !== 'playing') return;

  if (k === ' ') { servePlate(state); return; }
  if (k === 't' || k === 'backspace' || k === 'delete') { clearPlate(state); return; }
  if (k === 'g') {
    // G: drop a raw patty on the first free grill slot.
    const slot = state.grill.findIndex((slotState) => slotState === null);
    if (slot !== -1) grillPatty(state, slot);
    return;
  }
  if (k === 'f') {
    // F: take the first cooked patty off the grill.
    for (let i = 0; i < state.grill.length; i++) {
      if (state.grill[i] && grillStateAt(state, i) === 'cooked') { takeFromGrill(state, i); return; }
    }
    return;
  }
  const ing = INGREDIENTS.find((i) => i.key === k);
  if (ing) {
    const b = BIN_RECTS.find((r) => r.ing.id === ing.id);
    addBinIngredient(state, ing.id, b ? b.x + b.w / 2 : 640, b ? b.y + 20 : 560);
  }
}

export function canvasPos(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left) * (canvas.width / r.width),
    y: (clientY - r.top) * (canvas.height / r.height),
  };
}
