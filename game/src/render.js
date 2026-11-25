// Dapur Kilat — render: every pixel is drawn in code (canvas 2D).
// No image assets: the kitchen, the food and the customers are all procedural.

import { GRILL, ING_BY_ID, LAYOUT, PALETTE, VIEW } from './config.js';
import { grillStateAt, nextNeeded } from './state.js';
import { BIN_RECTS, CLICK_ZONES, GRILL_RECTS } from './input.js';

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'center', weight = 'bold', font = 'system-ui, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function shadow(ctx, on) {
  ctx.shadowColor = on ? 'rgba(0,0,0,0.25)' : 'transparent';
  ctx.shadowBlur = on ? 6 : 0;
  ctx.shadowOffsetY = on ? 3 : 0;
}

// ---------- ingredient art ----------

export function drawIngredient(ctx, id, cx, cy, w, opts = {}) {
  const s = w / 100; // scale: art is authored at 100 wide
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  if (opts.ghost) ctx.globalAlpha = 0.35;
  switch (id) {
    case 'bunBottom': {
      ctx.fillStyle = '#e8a34c';
      rr(ctx, -46, -6, 92, 26, 10); ctx.fill();
      ctx.fillStyle = '#d18a2e';
      rr(ctx, -46, 12, 92, 8, 4); ctx.fill();
      break;
    }
    case 'bunTop': {
      ctx.fillStyle = '#f0b45c';
      ctx.beginPath();
      ctx.moveTo(-48, 14);
      ctx.quadraticCurveTo(-48, -30, 0, -30);
      ctx.quadraticCurveTo(48, -30, 48, 14);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe9b0';
      [[-28, -12], [-8, -20], [12, -16], [28, -8], [0, -6]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.ellipse(x, y, 4, 2.6, 0.4, 0, TAU); ctx.fill();
      });
      ctx.fillStyle = '#d18a2e';
      rr(ctx, -48, 10, 96, 7, 3); ctx.fill();
      break;
    }
    case 'patty': {
      const cooked = opts.cooked ?? true;
      ctx.fillStyle = cooked ? '#6b3f1d' : '#c98a7a';
      rr(ctx, -46, -14, 92, 28, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 3;
      [-24, 0, 24].forEach((x) => {
        ctx.beginPath(); ctx.moveTo(x - 8, -10); ctx.lineTo(x + 8, 10); ctx.stroke();
      });
      if (opts.burnt) {
        ctx.fillStyle = 'rgba(20,10,5,0.55)';
        rr(ctx, -46, -14, 92, 28, 12); ctx.fill();
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#58b368';
      ctx.beginPath();
      ctx.moveTo(-48, 0);
      for (let x = -48; x <= 48; x += 12) {
        ctx.quadraticCurveTo(x + 6, -16, x + 12, 0);
      }
      ctx.lineTo(48, 10);
      for (let x = 48; x >= -48; x -= 12) {
        ctx.quadraticCurveTo(x - 6, 22, x - 12, 10);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3f8f4f';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-40, 4); ctx.lineTo(40, 4); ctx.stroke();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#e2483d';
      ctx.beginPath(); ctx.ellipse(0, 0, 44, 13, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2827a';
      ctx.beginPath(); ctx.ellipse(0, -2, 34, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd9d4';
      ctx.beginPath(); ctx.ellipse(-12, -4, 10, 3, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.save();
      ctx.rotate(-0.06);
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath();
      ctx.moveTo(-46, -12); ctx.lineTo(46, -12); ctx.lineTo(46, 8);
      ctx.lineTo(28, 8); ctx.quadraticCurveTo(26, 20, 18, 12);
      ctx.lineTo(4, 8); ctx.quadraticCurveTo(0, 22, -8, 10);
      ctx.lineTo(-46, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'sauce': {
      ctx.strokeStyle = '#ff8c42';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-44, -4);
      for (let x = -44; x <= 44; x += 11) ctx.lineTo(x, (x / 11) % 2 === 0 ? 6 : -8);
      ctx.stroke();
      ctx.strokeStyle = '#ffb37a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-44, -8);
      for (let x = -44; x <= 44; x += 11) ctx.lineTo(x, (x / 11) % 2 === 0 ? 2 : -12);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// ---------- kitchen background ----------

function drawKitchen(ctx, t) {
  // Wall + tiles.
  const grad = ctx.createLinearGradient(0, 0, 0, 500);
  grad.addColorStop(0, PALETTE.wallTop);
  grad.addColorStop(1, PALETTE.wallBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.w, 500);
  ctx.strokeStyle = 'rgba(180,140,80,0.25)';
  ctx.lineWidth = 2;
  for (let y = 84; y < 500; y += 42) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW.w, y); ctx.stroke();
  }
  for (let x = 0; x < VIEW.w; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 84); ctx.lineTo(x, 500); ctx.stroke();
  }
  // Hanging lamps.
  [320, 640, 960].forEach((x) => {
    ctx.strokeStyle = '#5a4632';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 46); ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(x - 26, 52); ctx.lineTo(x + 26, 52); ctx.lineTo(x + 12, 26); ctx.lineTo(x - 12, 26); ctx.closePath(); ctx.fill();
    const glow = ctx.createRadialGradient(x, 62, 4, x, 62, 70);
    glow.addColorStop(0, 'rgba(255,220,120,0.55)');
    glow.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, 62, 70, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.ellipse(x, 54, 14, 6, 0, 0, TAU); ctx.fill();
  });
  // Wooden counter.
  ctx.fillStyle = PALETTE.counter;
  ctx.fillRect(0, 500, VIEW.w, 220);
  ctx.fillStyle = PALETTE.counterEdge;
  ctx.fillRect(0, 500, VIEW.w, 10);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let x = 40; x < VIEW.w; x += 160) {
    ctx.beginPath(); ctx.moveTo(x, 510); ctx.lineTo(x, 720); ctx.stroke();
  }
  // Shelf with jars (decor).
  ctx.fillStyle = '#7a4a21';
  ctx.fillRect(880, 78, 380, 10);
  const jars = ['#e2483d', '#58b368', '#ffc93c', '#ff8c42'];
  jars.forEach((c, i) => {
    const x = 910 + i * 90;
    ctx.fillStyle = c;
    rr(ctx, x, 40, 52, 38, 8); ctx.fill();
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(x + 10, 32, 32, 10);
  });
  void t;
}

// ---------- top bar ----------

function drawTopBar(ctx, state) {
  const b = LAYOUT.topBar;
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // Logo.
  text(ctx, '🍳', 34, 34, 26, '#fff', 'center');
  text(ctx, 'DAPUR KILAT', 120, 26, 26, '#ffd94d', 'left');
  text(ctx, 'Masak cepat, sajikan tepat!', 120, 48, 13, '#f7e8c9', 'left');
  // Timer.
  const mm = Math.floor(state.timeLeft / 60);
  const ss = Math.floor(state.timeLeft % 60).toString().padStart(2, '0');
  const urgent = state.timeLeft <= 15 && state.screen === 'playing';
  const tc = urgent ? (Math.floor(performance.now() / 300) % 2 ? '#ff6b5e' : '#ffd94d') : '#fff';
  text(ctx, `⏱ ${mm}:${ss}`, 560, 32, 30, tc);
  // Timer bar.
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  rr(ctx, 470, 52, 180, 7, 3); ctx.fill();
  ctx.fillStyle = urgent ? '#ff6b5e' : '#7be495';
  rr(ctx, 470, 52, 180 * (state.timeLeft / 120), 7, 3); ctx.fill();
  // Score / coins / hearts.
  text(ctx, `Skor ${state.score}`, 760, 32, 22, '#fff');
  text(ctx, `🪙 ${state.coins}`, 900, 32, 22, '#ffd94d');
  const hearts = '♥'.repeat(state.hearts) + '♡'.repeat(Math.max(0, 3 - state.hearts));
  text(ctx, hearts, 1030, 32, 24, '#ff6b81');
  if (state.combo >= 2) {
    text(ctx, `COMBO x${state.combo}`, 1160, 32, 20, '#7be495');
  }
}

// ---------- order board ----------

function drawFace(ctx, x, y, r, mood) {
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.15, r * 0.1, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3a2a18';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mood === 'happy') ctx.arc(x, y + r * 0.1, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (mood === 'worried') ctx.arc(x, y + r * 0.55, r * 0.35, 1.15 * Math.PI, 1.85 * Math.PI);
  else ctx.arc(x, y + r * 0.25, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawTicket(ctx, order, x, y, w, h) {
  const ratio = order.patience / order.patienceMax;
  const mood = ratio > 0.5 ? 'happy' : ratio > 0.25 ? 'neutral' : 'worried';
  shadow(ctx, true);
  ctx.fillStyle = PALETTE.paper;
  rr(ctx, x, y, w, h, 10); ctx.fill();
  shadow(ctx, false);
  ctx.fillStyle = ratio > 0.25 ? '#3a2a18' : '#d64541';
  ctx.fillRect(x, y, 6, h);
  drawFace(ctx, x + 34, y + 30, 20, mood);
  text(ctx, order.recipe.name, x + 62, y + 22, 16, PALETTE.ink, 'left');
  text(ctx, order.recipe.en, x + 62, y + 42, 11, '#8a7a5f', 'left');
  // Recipe icons in stack order.
  const iw = Math.min(44, (w - 24) / order.recipe.build.length);
  order.recipe.build.forEach((id, i) => {
    drawIngredient(ctx, id, x + 20 + i * iw + iw / 2, y + 78, iw * 0.85, { cooked: true });
  });
  // Patience bar.
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  rr(ctx, x + 14, y + h - 18, w - 28, 9, 4); ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? '#3f9e4d' : ratio > 0.25 ? '#f5b301' : '#d64541';
  rr(ctx, x + 14, y + h - 18, (w - 28) * ratio, 9, 4); ctx.fill();
  text(ctx, `${Math.ceil(order.patience)} dtk`, x + w - 16, y + h - 32, 11, '#8a7a5f', 'right');
}

function drawBoard(ctx, state) {
  const b = LAYOUT.board;
  ctx.fillStyle = '#5a4632';
  rr(ctx, b.x - 4, b.y - 4, b.w + 8, b.h + 8, 12); ctx.fill();
  ctx.fillStyle = '#f3e2b8';
  rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
  text(ctx, '📋 PAPAN PESANAN', b.x + b.w / 2, b.y + 24, 18, '#5a4632');
  if (state.orders.length === 0) {
    text(ctx, 'Belum ada pesanan…', b.x + b.w / 2, b.y + 120, 16, '#8a7a5f');
    text(ctx, 'Pelanggan segera datang!', b.x + b.w / 2, b.y + 150, 13, '#8a7a5f');
  }
  state.orders.forEach((o, i) => {
    drawTicket(ctx, o, b.x + 14, b.y + 46 + i * 118, b.w - 28, 108);
  });
  text(ctx, `Tersaji: ${state.served}   Hangus: ${state.lost}`, b.x + b.w / 2, b.y + b.h - 12, 13, '#8a7a5f');
}

// ---------- grill, plate, bell, trash ----------

function drawGrill(ctx, state, t) {
  const g = LAYOUT.grill;
  shadow(ctx, true);
  ctx.fillStyle = '#2e2a26';
  rr(ctx, g.x, g.y, g.w, g.h, 12); ctx.fill();
  shadow(ctx, false);
  ctx.fillStyle = '#45403a';
  rr(ctx, g.x + 8, g.y + 8, g.w - 16, g.h - 16, 8); ctx.fill();
  text(ctx, '🔥 PANGGANGAN', g.x + g.w / 2, g.y + 26, 15, '#ffd9a0');
  GRILL_RECTS.forEach((r, i) => {
    ctx.fillStyle = '#1d1a17';
    rr(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.strokeStyle = '#5a534b';
    ctx.lineWidth = 2;
    for (let gx = r.x + 12; gx < r.x + r.w; gx += 14) {
      ctx.beginPath(); ctx.moveTo(gx, r.y + 6); ctx.lineTo(gx, r.y + r.h - 6); ctx.stroke();
    }
    const slot = state.grill[i];
    if (slot) {
      const s = grillStateAt(state, i);
      const prog = Math.min(1, slot.t / GRILL.cookTime);
      drawIngredient(ctx, 'patty', r.x + r.w / 2, r.y + r.h / 2 + 4, 92, {
        cooked: s !== 'raw', burnt: s === 'burnt',
      });
      // Cook progress ring.
      ctx.strokeStyle = s === 'burnt' ? '#ff6b5e' : s === 'cooked' ? '#7be495' : '#ffd94d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 40, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, slot.t / GRILL.burnTime));
      ctx.stroke();
      if (s === 'cooked') {
        text(ctx, 'SIAP! Klik untuk ambil', r.x + r.w / 2, g.y + g.h - 8, 11, '#7be495');
      } else if (s === 'burnt') {
        text(ctx, 'GOSONG! Klik untuk buang', r.x + r.w / 2, g.y + g.h - 8, 11, '#ff7a59');
      }
      // Steam.
      if (s !== 'burnt') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.7 + k * 0.33 + i * 0.5) % 1;
          ctx.beginPath();
          ctx.arc(r.x + r.w / 2 + (k - 1) * 22, r.y + 12 - ph * 26, 4 + ph * 5, 0, TAU);
          ctx.fill();
        }
      }
    } else {
      text(ctx, 'Klik patty (2 / G)', r.x + r.w / 2, r.y + r.h / 2 - 6, 12, '#8a8378');
      text(ctx, 'untuk memanggang', r.x + r.w / 2, r.y + r.h / 2 + 12, 12, '#8a8378');
    }
  });
}

function drawPlate(ctx, state) {
  const p = LAYOUT.plate;
  shadow(ctx, true);
  ctx.fillStyle = '#f3e2b8';
  rr(ctx, p.x, p.y, p.w, p.h, 12); ctx.fill();
  shadow(ctx, false);
  text(ctx, '🍽 PIRING RAKIT', p.x + p.w / 2, p.y + 22, 15, '#5a4632');
  // Plate ellipse.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + 138, 120, 34, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#d8cdb4';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + 138, 120, 34, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + 138, 92, 24, 0, 0, TAU); ctx.stroke();
  // Stacked ingredients, bottom to top.
  const cx = p.x + p.w / 2;
  let y = p.y + 138;
  state.plate.forEach((id) => {
    y -= id === 'bunTop' ? 16 : 13;
    drawIngredient(ctx, id, cx, y, 150, { cooked: true });
  });
  if (state.plate.length === 0) {
    text(ctx, 'Klik bahan di bawah', cx, p.y + 118, 13, '#b0a58c');
    text(ctx, 'untuk merakit burger', cx, p.y + 136, 13, '#b0a58c');
  } else {
    const target = nextNeeded(state);
    if (target) {
      const done = state.plate.length;
      const next = target.recipe.build[done];
      if (next) {
        text(ctx, `Lanjut: ${ING_BY_ID[next].name}`, cx, p.y + 168, 12, '#3f9e4d');
      } else {
        text(ctx, 'Lengkap! Bunyikan lonceng 🔔', cx, p.y + 168, 13, '#3f9e4d');
      }
    }
  }
}

function drawBell(ctx, state, t) {
  const b = LAYOUT.bell;
  shadow(ctx, true);
  ctx.fillStyle = '#f3e2b8';
  rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
  shadow(ctx, false);
  text(ctx, 'SAJIKAN', b.x + b.w / 2, b.y + 20, 14, '#5a4632');
  const ring = state.bellRing > 0 ? Math.sin(state.bellRing * 30) * 0.12 : 0;
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + 92);
  ctx.rotate(ring);
  ctx.fillStyle = '#f5b301';
  ctx.beginPath();
  ctx.moveTo(-52, 18);
  ctx.quadraticCurveTo(-52, -34, 0, -34);
  ctx.quadraticCurveTo(52, -34, 52, 18);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d18f00';
  rr(ctx, -58, 14, 116, 10, 5); ctx.fill();
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath(); ctx.arc(0, 30, 7, 0, TAU); ctx.fill();
  ctx.restore();
  text(ctx, 'Klik / Spasi', b.x + b.w / 2, b.y + b.h - 14, 12, '#8a7a5f');
  void t;
}

function drawTrash(ctx, state) {
  const b = LAYOUT.trash;
  ctx.fillStyle = state.trashFlash > 0 ? '#ff9d8a' : '#e8dcc0';
  rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
  text(ctx, '🗑 SAMPAH', b.x + b.w / 2, b.y + 22, 14, '#5a4632');
  text(ctx, 'Buang isi piring (T)', b.x + b.w / 2, b.y + 46, 12, '#8a7a5f');
  text(ctx, 'Patty gosong dibuang di panggangan', b.x + b.w / 2, b.y + 66, 11, '#8a7a5f');
}

function drawTips(ctx, state) {
  const b = LAYOUT.tips;
  ctx.fillStyle = '#fff8e7';
  rr(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
  const target = nextNeeded(state);
  const tip = target
    ? `Pesanan: ${target.recipe.name}`
    : state.plate.length > 0
      ? 'Tidak cocok dengan pesanan — buang (T)'
      : 'Pilih bahan sesuai pesanan!';
  text(ctx, '💡 ' + tip, b.x + b.w / 2, b.y + 24, 13, '#5a4632');
  text(ctx, state.combo >= 2 ? `Combo x${state.combo} aktif!` : 'Sajikan cepat = bonus!', b.x + b.w / 2, b.y + 52, 12, '#8a7a5f');
}

// ---------- bins & help ----------

function drawBins(ctx, state, t) {
  const hint = state.screen === 'playing' ? nextNeeded(state) : null;
  const hintNext = hint && state.plate.length < hint.recipe.build.length
    ? hint.recipe.build[state.plate.length] : null;
  BIN_RECTS.forEach((b, i) => {
    const ing = b.ing;
    const isHint = hintNext === ing.id;
    const pulse = isHint ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
    shadow(ctx, true);
    ctx.fillStyle = isHint ? '#fff3c4' : '#fff8e7';
    rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    shadow(ctx, false);
    if (isHint) {
      ctx.strokeStyle = `rgba(245,179,1,${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 4;
      rr(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 10); ctx.stroke();
    }
    // Bin tray.
    ctx.fillStyle = PALETTE.steel;
    rr(ctx, b.x + 12, b.y + 52, b.w - 24, 52, 8); ctx.fill();
    ctx.fillStyle = PALETTE.steelDark;
    rr(ctx, b.x + 12, b.y + 52, b.w - 24, 10, 5); ctx.fill();
    drawIngredient(ctx, ing.id, b.x + b.w / 2, b.y + 72, Math.min(96, b.w - 30), { cooked: true });
    text(ctx, ing.name, b.x + b.w / 2, b.y + 116, 14, PALETTE.ink);
    // Key cap.
    ctx.fillStyle = '#3a2a18';
    rr(ctx, b.x + b.w / 2 - 13, b.y + 8, 26, 22, 5); ctx.fill();
    text(ctx, ing.key, b.x + b.w / 2, b.y + 19, 13, '#fff');
    void i;
  });
}

function drawHelp(ctx, state) {
  const h = LAYOUT.help;
  text(ctx, 'Klik bahan (atau tombol 1–7)  •  Patty dimasak dulu di panggangan (2 / G)  •  Ambil patty matang (klik / F)  •  Sajikan (lonceng / Spasi)  •  Buang (T)  •  Jeda (P)  •  Suara (M)',
    h.x + h.w / 2, h.y + 26, 14, '#fff8e7');
  if (state.muted) text(ctx, '🔇 Suara mati', h.x + h.w - 8, h.y + 26, 13, '#ffb3a7', 'right');
}

// ---------- overlays ----------

function drawTitle(ctx, state, t) {
  ctx.fillStyle = 'rgba(40,24,8,0.55)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const cx = VIEW.w / 2;
  const bob = Math.sin(t * 2) * 6;
  // Big burger mascot.
  ctx.save();
  ctx.translate(cx, 250 + bob);
  drawIngredient(ctx, 'bunTop', 0, -58, 260, { cooked: true });
  drawIngredient(ctx, 'lettuce', 0, -28, 260, { cooked: true });
  drawIngredient(ctx, 'cheese', 0, -8, 260, { cooked: true });
  drawIngredient(ctx, 'patty', 0, 12, 260, { cooked: true });
  drawIngredient(ctx, 'tomato', 0, 34, 260, { cooked: true });
  drawIngredient(ctx, 'bunBottom', 0, 52, 260, { cooked: true });
  ctx.restore();
  text(ctx, 'DAPUR KILAT', cx, 400, 64, '#ffd94d');
  text(ctx, 'Game memasak seru: rakit burger, sajikan cepat, kejar combo!', cx, 448, 20, '#fff');
  // Start button.
  const r = CLICK_ZONES.start;
  const hover = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.fillStyle = `rgb(63,158,77)`;
  shadow(ctx, true);
  rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
  shadow(ctx, false);
  ctx.strokeStyle = `rgba(255,255,255,${0.4 + hover * 0.4})`;
  ctx.lineWidth = 3;
  rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.stroke();
  text(ctx, '▶  MULAI SHIFT (Enter)', cx, r.y + r.h / 2, 22, '#fff');
  text(ctx, 'Shift 120 detik  •  3 hati  •  6 resep burger  •  Keyboard & mouse', cx, 580, 15, '#f7e8c9');
  text(ctx, 'Karya orisinal untuk make.fun — dibuat dengan canvas & WebAudio', cx, 606, 13, '#d8cdb4');
  void state;
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(40,24,8,0.6)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, '⏸ JEDA', VIEW.w / 2, 320, 56, '#ffd94d');
  text(ctx, 'Tekan P atau klik tombol untuk lanjut', VIEW.w / 2, 380, 18, '#fff');
  const r = CLICK_ZONES.start;
  ctx.fillStyle = '#3f9e4d';
  rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
  text(ctx, '▶  LANJUTKAN', VIEW.w / 2, r.y + r.h / 2, 22, '#fff');
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(40,24,8,0.65)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const cx = VIEW.w / 2;
  const stars = state.score >= 900 ? 3 : state.score >= 600 ? 2 : state.score >= 300 ? 1 : 0;
  text(ctx, state.overReason, cx, 170, 24, '#fff');
  text(ctx, '★'.repeat(stars) + '☆'.repeat(3 - stars), cx, 230, 54, '#ffd94d');
  text(ctx, `SKOR AKHIR  ${state.score}`, cx, 310, 40, '#ffd94d');
  text(ctx, `Burger tersaji: ${state.served}    Koin: ${state.coins}    Combo terbaik: x${state.bestCombo}`, cx, 360, 18, '#fff');
  text(ctx, `Sempurna: ${state.stats.perfect}   Salah resep: ${state.stats.wrong}   Gosong: ${state.stats.burnt}`, cx, 392, 15, '#f7e8c9');
  const rank = state.score >= 900 ? 'Koki Bintang Tiga!' : state.score >= 600 ? 'Koki Hebat!' : state.score >= 300 ? 'Koki Magang Naik Kelas!' : 'Terus berlatih, Koki!';
  text(ctx, rank, cx, 440, 22, '#7be495');
  const r = CLICK_ZONES.restart;
  ctx.fillStyle = '#3f9e4d';
  rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
  text(ctx, '↻  MAIN LAGI (R)', cx, r.y + r.h / 2, 22, '#fff');
}

function drawMessage(ctx, state) {
  if (!state.message) return;
  const a = Math.min(1, state.message.life);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(58,42,24,0.9)';
  rr(ctx, VIEW.w / 2 - 260, 78, 520, 58, 12); ctx.fill();
  text(ctx, state.message.text, VIEW.w / 2, 98, 22, '#ffd94d');
  if (state.message.sub) text(ctx, state.message.sub, VIEW.w / 2, 122, 14, '#fff');
  ctx.restore();
}

function drawFx(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- main entry ----------

export function render(ctx, state, t) {
  ctx.save();
  if (state.shake > 0) {
    const m = state.shake * 14;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawKitchen(ctx, t);
  drawTopBar(ctx, state);
  drawBoard(ctx, state);
  drawGrill(ctx, state, t);
  drawPlate(ctx, state);
  drawBell(ctx, state, t);
  drawTrash(ctx, state);
  drawTips(ctx, state);
  drawBins(ctx, state, t);
  drawHelp(ctx, state);
  drawFx(ctx, state);
  drawMessage(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state, t);
  else if (state.screen === 'paused') drawPaused(ctx);
  else if (state.screen === 'over') drawGameOver(ctx, state);
  ctx.restore();
}
