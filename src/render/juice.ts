/* Juice: sound, particles and small screen effects for the first minutes (and everything after). Nothing here changes what happens in the game:
   it only listens (wrapped functions) and draws. Particles live in world space (`drawJuice`, called after the ripe glow in render/main.ts),
   a small screen shake moves the canvas with a CSS transform, and the sounds are built from `sndTone`/`sndNoise` (ui/sound.ts).
   Farming in a run climbs a scale (`JUICE.combo`), so a row of turnips is a little tune. */
const JUICE: any = { parts: [] as any[], shake: 0, combo: { job: '', n: 0, t: 0 }, place: { n: 0, t: 0 }, fade: 0, lastStep: '' };
const jNow = () => performance.now();
const jRand = (a: number, b: number) => a + Math.random() * (b - a);
/** a buzz on phones that have it */
const jBuzz = (ms: number) => { try { if (navigator && (navigator as any).vibrate && !(window as any).GH_NOSOUND) (navigator as any).vibrate(ms); } catch (e) {} };
/** a burst of particles at a world point (px) */
function jBurst(x: number, y: number, n: number, kind: string, col: string | string[], spd = 1, up = 1) {
  if (JUICE.parts.length > 420) JUICE.parts.splice(0, JUICE.parts.length - 380);
  for (let i = 0; i < n; i++) {
    const a = jRand(0, Math.PI * 2), v = jRand(0.4, 1) * spd;
    JUICE.parts.push({ x, y, vx: Math.cos(a) * v * 60, vy: Math.sin(a) * v * 40 - up * jRand(30, 70), g: kind === 'spark' ? 20 : kind === 'confetti' ? 60 : 160, t0: jNow(), life: kind === 'confetti' ? jRand(1400, 2200) : kind === 'spark' ? jRand(500, 900) : jRand(420, 700),
      col: Array.isArray(col) ? col[(Math.random() * col.length) | 0] : col, s: kind === 'confetti' ? jRand(2.5, 4) : kind === 'leaf' ? jRand(2, 3.5) : jRand(1.4, 2.6), kind, rot: jRand(0, 6), vr: jRand(-8, 8) });
  }
}
/** something flies from a world point up to the player (a turnip to the bag, a coin to the purse) */
function jFly(x: number, y: number, kind: string, col: string, delay = 0) {
  JUICE.parts.push({ x, y, x0: x, y0: y, t0: jNow() + delay, life: 520, kind: 'fly', icon: kind, col, s: kind === 'coin' ? 3 : 4.2 });
}
function jShake(px: number) { JUICE.shake = Math.max(JUICE.shake, px); }
const jTile = (x: number, y: number) => ({ x: x * TS + TS / 2, y: y * TS + TS / 2 });
const jSemi = (n: number) => Math.pow(2, Math.min(14, n) / 12);
/** consecutive farm work within a moment climbs a scale */
function jCombo(job: string): number {
  const c = JUICE.combo, now = jNow(); if (c.job === job && now - c.t < 2600) c.n++; else { c.job = job; c.n = 0; } c.t = now; return c.n;
}
const J_SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];   // (a major scale: a row of plots plays it upward)

/* ---- the sounds ---- */
function jsPlough(k: number) { if (!sndReady()) return; sndNoise(0.16, 'lowpass', 520, 0.2, 160); sndTone(120, 0.12, 'sine', 0.16, 58); sndTone(330 * jSemi(J_SCALE[k % 15]), 0.09, 'triangle', 0.05, undefined, 0.04); }
function jsSow(k: number) { if (!sndReady()) return; const f = 523 * jSemi(J_SCALE[k % 15]); sndTone(f, 0.12, 'triangle', 0.09, f * 1.01); sndTone(f * 2, 0.08, 'sine', 0.04, undefined, 0.05); sndNoise(0.05, 'highpass', 4200, 0.03); }
function jsHarvest(k: number) { if (!sndReady()) return; const f = 587 * jSemi(J_SCALE[k % 15]); sndTone(260, 0.07, 'sine', 0.14, 520); sndTone(f, 0.18, 'triangle', 0.1, undefined, 0.05); sndTone(f * 1.5, 0.22, 'sine', 0.06, undefined, 0.1); }
function jsCoins(n: number) { if (!sndReady()) return; const m = Math.min(10, Math.max(1, n)); for (let i = 0; i < m; i++) { sndTone(1480 + i * 40, 0.06, 'square', 0.025, 2200, i * 0.045); sndTone(2960, 0.05, 'sine', 0.025, undefined, i * 0.045 + 0.02); } sndTone(1046, 0.25, 'triangle', 0.06, undefined, m * 0.045); sndTone(1568, 0.3, 'sine', 0.05, undefined, m * 0.045 + 0.05); }
function jsSpend(n: number) { if (!sndReady()) return; for (let i = 0; i < Math.min(4, n); i++) sndTone(900 - i * 60, 0.05, 'square', 0.02, 700, i * 0.05); }
function jsFanfare() { if (!sndReady()) return; [523, 659, 784, 1046].forEach((f, i) => { sndTone(f, 0.22, 'triangle', 0.08, undefined, i * 0.08); sndTone(f * 2, 0.16, 'sine', 0.03, undefined, i * 0.08 + 0.02); }); sndTone(1568, 0.5, 'sine', 0.05, undefined, 0.34); }
function jsDing() { if (!sndReady()) return; sndTone(880, 0.16, 'sine', 0.07); sndTone(1320, 0.28, 'sine', 0.05, undefined, 0.07); }
function jsCrack() { if (!sndReady()) return; sndNoise(0.12, 'bandpass', 1100, 0.2, 400); sndTone(160, 0.1, 'square', 0.06, 70); sndNoise(0.25, 'lowpass', 300, 0.08, 120, 0.06); }
function jsLullaby() { if (!sndReady()) return; [392, 330, 294, 262].forEach((f, i) => sndTone(f, 0.7, 'sine', 0.05, undefined, i * 0.38)); }
function jsMorning() { if (!sndReady()) return; for (let i = 0; i < 5; i++) { const f = jRand(2200, 3200); sndTone(f, 0.09, 'sine', 0.035, f * 1.25, 0.2 + i * 0.17); sndTone(f * 1.2, 0.07, 'sine', 0.025, f, 0.27 + i * 0.17); } [523, 659, 784].forEach((f, i) => sndTone(f, 0.5, 'triangle', 0.04, undefined, 0.1 + i * 0.12)); }
function jsCreak() { if (!sndReady() || !sndThrottle('creak', 700)) return; sndTone(310, 0.18, 'sawtooth', 0.018, 190); sndTone(180, 0.1, 'triangle', 0.03, 140, 0.15); }
function jsClick() { if (!sndReady()) return; sndTone(1200, 0.03, 'square', 0.025, 900); }
/** each speaker has a voice: a few soft blips as the line appears (Paullus low, Junia higher, you in between) */
function jsVoice(n: any, text: string) {
  if (!sndReady() || !n) return; const base = n.first === 'Paullus' ? 150 : n.first === 'Junia' ? 300 : n.female ? 280 : 190, k = Math.min(6, 2 + Math.floor(text.length / 14));
  for (let i = 0; i < k; i++) sndTone(base * jRand(0.92, 1.25), 0.05, 'triangle', 0.035, base * jRand(0.85, 1.1), i * 0.065);
}

/* ---- listening to the game ---- */
// the end of every action of yours: farming, felling, smashing
// @ts-expect-error -- deliberate patch
const _jFinish = playerFinish; playerFinish = function (n, a) {
  const r = _jFinish(n, a); if (!n || !n.player || !a || !a.key) return r;
  const m = /^crop(\d+),(\d+)([psh])/.exec(a.key); if (m) {
    const x = +m[1], y = +m[2], p = jTile(x, y), job = m[3], k = jCombo(job);
    if (job === 'p') { jsPlough(k); jBurst(p.x, p.y + 4, 12, 'dot', ['#6b4a2b', '#8a6239', '#4e3420'], 1.1, 0.8); jShake(1.6); }
    if (job === 's') { jsSow(k); jBurst(p.x, p.y, 7, 'spark', ['#c8e86a', '#f4d36a', '#ffffff'], 0.7, 0.6); }
    if (job === 'h') { jsHarvest(k); jBurst(p.x, p.y, 10, 'leaf', ['#5fae3a', '#7fcf4a', '#3e8a2a'], 1.2, 1); jFly(p.x, p.y, 'crop', '#c86fd8'); jShake(1.2); jBuzz(12); }
    if (k >= 2) addPop(n.x * TS + TS / 2, n.y * TS - 18, 'x' + (k + 1), k >= 6 ? '#ffb347' : '#ffe08a');
    return r;
  }
  if (/^(tree|rock)/.test(a.key)) { const f = lf2Front(n), p = jTile(f.x, f.y); jBurst(p.x, p.y, 10, 'dot', /^tree/.test(a.key) ? ['#7a5230', '#5fae3a'] : ['#9a9a9a', '#cfcfcf'], 1.2, 1); jShake(2.4); }
  return r;
};
// things put down in build mode: a dust puff, and a line of them climbs in pitch
// @ts-expect-error -- deliberate patch
const _jPlace = sndPlace; sndPlace = function (vol) {
  _jPlace(vol); const P = game.player; if (!P || !P.player) return;
  const now = jNow(), pl = JUICE.place; pl.n = now - pl.t < 1800 ? pl.n + 1 : 0; pl.t = now;
  if (sndReady()) sndTone(392 * jSemi(J_SCALE[pl.n % 15]), 0.1, 'triangle', 0.05, undefined, 0.03);
  const f = lf2Front(P), p = jTile(f.x, f.y); jBurst(p.x, p.y + 8, 9, 'dot', ['#d9c9a3', '#bba57a', '#e8dcc0'], 0.9, 0.5); jShake(1);
};
// the hammer: a crack and splinters
// @ts-expect-error -- deliberate patch
const _jDel = bldDeleteProp; bldDeleteProp = function (pr, by) {
  const x = pr && pr.x, y = pr && pr.y, k = pr && pr.kind, r = _jDel(pr, by);
  if (r && by && by.player) { const p = jTile(x, y); jsCrack(); jBurst(p.x, p.y, 16, 'leaf', k === 'fence' || k === 'gate' ? ['#8a5a32', '#b07a48', '#5e3a1e'] : ['#9a9a9a', '#c8c8c8'], 1.4, 1); jShake(3); jBuzz(18); }
  return r;
};
// coins: in from a sale, out for a purchase
// @ts-expect-error -- deliberate patch
const _jSell = shopSell; shopSell = function (e, q) {
  const c0 = game.player.coin; _jSell(e, q); const got = Math.round(game.player.coin - c0); const P = game.player;
  if (got > 0) { jsCoins(got); for (let i = 0; i < Math.min(12, got); i++) jFly(P.x * TS + TS / 2 + jRand(-30, 30), P.y * TS - jRand(10, 40), 'coin', '#f4c542', i * 45); jBuzz(25); jShopShine(); }
};
// @ts-expect-error -- deliberate patch
const _jBuy = shopBuy; shopBuy = function (e, q) { const c0 = game.player.coin; _jBuy(e, q); const spent = Math.round(c0 - game.player.coin); if (spent > 0) { jsSpend(spent); jShopShine(); } };
function jShopShine() { const d = document.getElementById('shoppanel'); if (!d) return; d.classList.remove('jshine'); void (d as any).offsetWidth; d.classList.add('jshine'); }
// an item card: a little fanfare
// @ts-expect-error -- deliberate patch
const _jCard = itemCardNext; itemCardNext = function () { const was = ITEMCARD.open; _jCard(); if (ITEMCARD.open) { jsFanfare(); jBuzz(20); const P = game.player; if (P && !was) jBurst(P.x * TS + TS / 2, P.y * TS, 18, 'spark', ['#ffe08a', '#ffffff', '#f4c542'], 1.2, 1); } };
// a tutorial task done: a ding and a sparkle where you stand
// @ts-expect-error -- deliberate patch
const _jNext = tut2Next; tut2Next = function (s) { _jNext(s); if (s && s.do === 'wait' && s.bot && game.player) { jsDing(); const P = game.player; jBurst(P.x * TS + TS / 2, P.y * TS + 4, 10, 'spark', ['#ffe08a', '#b9e29a', '#ffffff'], 0.9, 0.9); } };
// every line spoken in the tutorial has its speaker's voice
// @ts-expect-error -- deliberate patch
const _jSay = tut2Say; tut2Say = function (n, text, to) { const r = _jSay(n, text, to); jsVoice(n, text); return r; };
// the end of the first morning: confetti and a fanfare
// @ts-expect-error -- deliberate patch
const _jEnd = tut2End; tut2End = function (T2) { _jEnd(T2); const P = game.player; jsFanfare(); setTimeout(jsFanfare, 450); if (P) { jBurst(P.x * TS + TS / 2, P.y * TS - 10, 70, 'confetti', ['#f4c542', '#e8604c', '#5fae3a', '#4a8ee8', '#c86fd8', '#ffffff'], 2.2, 1.6); } jBuzz(40); };
// footsteps: a gate creaks, a field puffs a little dust
// @ts-expect-error -- deliberate patch
const _jStep = sndStep; sndStep = function (n) {
  _jStep(n); if (!n || !n.player) return; const pr = lfPropAt(n.tx, n.ty);
  if (pr && pr.kind === 'gate') jsCreak();
  if (grid[n.ty] && grid[n.ty][n.tx] === T.CROP && Math.random() < 0.6) jBurst(n.tx * TS + TS / 2, n.ty * TS + TS - 4, 3, 'dot', ['#8a6239', '#6b4a2b'], 0.4, 0.3);
};
// buttons click
if (typeof document !== 'undefined') document.addEventListener('click', (e: any) => { if (e.target && e.target.closest && e.target.closest('button')) jsClick(); }, true);

/** the frame: particles, the shake, the night and the morning (world space) */
function drawJuice(c: any, now: number) {
  // the sleep fade: a lullaby going down, birds coming up
  if (typeof town !== 'undefined' && town && town.tut2 && town.tut2.ui) { const f = town.tut2.ui.fade || 0; if (f >= 0.9 && JUICE.fade < 0.9) jsLullaby(); if (f <= 0.1 && JUICE.fade > 0.1) jsMorning(); JUICE.fade = f; }
  // ripe crops twinkle now and then
  if (town && town.crops && Math.random() < 0.25) { const k = town.crops[(Math.random() * town.crops.length) | 0]; if (k && k.st && cropStage(k) === 4 && !itIsFlower(k)) jBurst(k.x * TS + jRand(4, TS - 4), k.y * TS + jRand(2, TS - 6), 1, 'spark', ['#fff4b0', '#ffe08a'], 0.15, 0.4); }
  const P = game.player, ps = JUICE.parts;
  for (let i = ps.length - 1; i >= 0; i--) {
    const q = ps[i], age = now - q.t0; if (age < 0) continue; if (age > q.life) { ps.splice(i, 1); continue; }
    const t = age / 1000, k = age / q.life; c.save(); c.globalAlpha = q.kind === 'confetti' ? Math.min(1, (1 - k) * 2) : 1 - k * k;
    if (q.kind === 'fly') {   // (an arc from the plot to you)
      const tx = P ? P.x * TS + TS / 2 : q.x0, ty = P ? P.y * TS + 2 : q.y0, e = k * k * (3 - 2 * k), x = q.x0 + (tx - q.x0) * e, y = q.y0 + (ty - q.y0) * e - Math.sin(k * Math.PI) * 26;
      c.fillStyle = q.col; c.strokeStyle = 'rgba(40,25,10,.7)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, q.s * (1 - k * 0.4), 0, 6.3); c.fill(); c.stroke();
      if (q.icon === 'crop') { c.fillStyle = '#5fae3a'; c.fillRect(x - 1, y - q.s - 3, 2, 3); } else { c.fillStyle = '#fff6c0'; c.fillRect(x - 1, y - 1, 1.6, 1.6); }
      c.restore(); continue;
    }
    const x = q.x + q.vx * t, y = q.y + q.vy * t + 0.5 * q.g * t * t;
    c.fillStyle = q.col;
    if (q.kind === 'spark') { const s = q.s * (1 - k * 0.5); c.globalCompositeOperation = 'lighter'; c.fillRect(x - s, y - 0.5, s * 2, 1); c.fillRect(x - 0.5, y - s, 1, s * 2); }
    else if (q.kind === 'leaf' || q.kind === 'confetti') { c.translate(x, y); c.rotate(q.rot + q.vr * t); c.fillRect(-q.s, -q.s * 0.5, q.s * 2, q.s); }
    else { c.beginPath(); c.arc(x, y, q.s, 0, 6.3); c.fill(); }
    c.restore();
  }
  // the shake decays; the canvas is moved, never the world
  if (typeof canvas !== 'undefined' && canvas) { const s = JUICE.shake; if (s > 0.05) { canvas.style.transform = `translate(${jRand(-s, s).toFixed(1)}px,${jRand(-s, s).toFixed(1)}px)`; JUICE.shake *= 0.82; } else if (JUICE.shake) { JUICE.shake = 0; canvas.style.transform = ''; } }
}
