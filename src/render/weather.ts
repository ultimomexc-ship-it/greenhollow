/* Weather, a prototype: sunny, cloudy, rain, storm, windy, fog and snow, picked from the Weather buttons in the top bar (outside the game; the
   game itself never changes it yet). Nothing here touches the simulation: it is drawn over the finished world in screen space (render/main.ts,
   after the blueprint look and before the bubbles), it stirs the trees' wind (TREES.wind) and plays its own loops (rain, wind) and thunder.
   One kind at a time; a change cross-fades over a couple of seconds. Everything runs on its own random numbers, so the game's seeded stream never moves. */
const WX: any = { kind: 'off', from: 'off', mix: 1, t0: 0, seed: 991, rain: [], snow: [], leaves: [], splash: [], flash: 0, nextBolt: 0, snd: null, last: 0 };
const WX_KINDS = ['off', 'sunny', 'cloudy', 'rain', 'storm', 'windy', 'fog', 'snow'];
const WX_LABEL: Record<string, string> = { off: 'Off', sunny: 'Sunny', cloudy: 'Cloudy', rain: 'Rain', storm: 'Storm', windy: 'Windy', fog: 'Fog', snow: 'Snow' };
const wxRand = () => { WX.seed = (WX.seed * 1103515245 + 12345) & 0x7fffffff; return WX.seed / 0x7fffffff; };
/** how much each kind does: tint, darkening, rain, snow, wind (trees and blown leaves), cloud shadows, fog, sun rays, lightning */
const WX_DEF: Record<string, any> = {
  off: {},
  sunny: { warm: 0.22, rays: 1 },
  cloudy: { grey: 0.28, dark: 0.08, clouds: 0.55, wind: 1.4 },
  rain: { grey: 0.36, dark: 0.26, rain: 0.6, clouds: 0.4, wind: 1.7, slant: 0.25, wet: 1 },
  storm: { grey: 0.45, dark: 0.48, rain: 1, clouds: 0.6, wind: 3.4, slant: 0.55, wet: 1, bolts: 1, leaves: 0.4 },
  windy: { grey: 0.08, clouds: 0.3, wind: 3.2, leaves: 1, dust: 1 },
  fog: { grey: 0.2, fog: 1, wind: 0.6 },
  snow: { cold: 0.3, snow: 1, wind: 1.2, dark: 0.04 }
};
/** a value of the weather now, cross-faded between the old kind and the new */
const wxV = (k: string, d = 0) => { const a = WX_DEF[WX.from][k] ?? d, b = WX_DEF[WX.kind][k] ?? d; return a + (b - a) * WX.mix; };
function wxSet(kind: string) {
  if (!WX_KINDS.includes(kind) || kind === WX.kind) return;
  WX.from = WX.mix < 1 ? (WX.mix > 0.5 ? WX.kind : WX.from) : WX.kind; WX.kind = kind; WX.mix = 0; WX.t0 = performance.now();
  document.querySelectorAll('[data-wx]').forEach((b: any) => b.setAttribute('aria-pressed', b.dataset.wx === kind ? 'true' : 'false'));
}
/* the buttons, in the top bar beside the speed */
(function wxButtons() {
  if (typeof document === 'undefined') return; const box = document.querySelector('header .controls'); if (!box) return;
  const seg = document.createElement('div'); seg.className = 'seg wxseg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Weather (prototype)');
  seg.innerHTML = '<span class="wxlab">Weather</span>' + WX_KINDS.map(k => `<button type="button" data-wx="${k}" aria-pressed="${k === 'off'}">${WX_LABEL[k]}</button>`).join('');
  box.appendChild(seg); seg.addEventListener('click', (e: any) => { const b = e.target.closest('[data-wx]'); if (b) wxSet(b.dataset.wx); });
})();

/** the weather's loops: rain (bright hiss), wind (low roar that gusts) */
function wxSound(now: number, rain: number, wind: number) {
  if (typeof sndReady !== 'function' || !sndReady() || !SND.noiseBuf) return; const c = SND.ctx;
  if (!WX.snd) { const mk = (type: string, f: number, q: number) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = SND.noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(SND.master); s.start(); return { g, fl }; };
    WX.snd = { rain: mk('highpass', 1400, 0.4), patter: mk('bandpass', 3200, 1.2), wind: mk('lowpass', 380, 0.9) }; }
  const t = c.currentTime, P = game.player, inside = P && roomAt[P.ty] && roomAt[P.ty][P.tx] >= 0, k = inside ? 0.35 : 1, gust = 0.6 + 0.4 * Math.sin(now / 1700) * Math.sin(now / 650 + 1);
  WX.snd.rain.g.gain.setTargetAtTime(0.11 * rain * k, t, 0.4); WX.snd.patter.g.gain.setTargetAtTime(0.05 * rain * k, t, 0.4);
  WX.snd.wind.g.gain.setTargetAtTime(Math.max(0, wind - 1) * 0.045 * gust * k, t, 0.3); WX.snd.wind.fl.frequency.setTargetAtTime(300 + 260 * gust, t, 0.3);
}
/** thunder: a crack, then a long low roll, later the farther the bolt */
function wxThunder(delay: number) {
  if (typeof sndReady !== 'function' || !sndReady()) return;
  sndNoise(0.35, 'lowpass', 1800, 0.18, 300, delay); sndNoise(2.6, 'lowpass', 260, 0.32, 60, delay + 0.08); sndTone(48, 2.2, 'sine', 0.12, 30, delay + 0.1);
}

function drawWeather(c: any, now: number) {
  if (WX.kind === 'off' && WX.from === 'off') { if (WX.snd) wxSound(now, 0, 0); TREES.wind = 1; return; }
  const dt = Math.min(0.1, Math.max(0, (now - (WX.last || now)) / 1000)); WX.last = now;
  WX.mix = Math.min(1, (performance.now() - WX.t0) / 2200); if (WX.mix >= 1) WX.from = WX.kind;
  const w = cam.cw, h = cam.ch, P = game.player, inside = !!(P && roomAt[P.ty] && roomAt[P.ty][P.tx] >= 0), T = now / 1000;
  const wind = wxV('wind', 1), rain = wxV('rain'), snow = wxV('snow'), slant = wxV('slant');
  TREES.wind = Math.max(0.4, wind);
  if (typeof wxSound === 'function') wxSound(now, rain, wind);
  const z = cam.z, wx0 = cam.x, wy0 = cam.y;   // (world position of the screen's corner, for things that sit on the ground)
  c.save();
  // light: grey, darker, warm or cold
  const grey = wxV('grey'), dark = wxV('dark'), warm = wxV('warm'), cold = wxV('cold');
  if (grey > 0) { c.globalCompositeOperation = 'saturation'; c.globalAlpha = grey; c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); }
  if (dark > 0) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = 1; c.fillStyle = `rgba(${Math.round(255 - 150 * dark)},${Math.round(255 - 140 * dark)},${Math.round(255 - 110 * dark)},1)`; c.fillRect(0, 0, w, h); }
  if (warm > 0) { c.globalCompositeOperation = 'soft-light'; c.globalAlpha = warm * 1.6; c.fillStyle = '#ffcf6a'; c.fillRect(0, 0, w, h); }
  if (cold > 0) { c.globalCompositeOperation = 'soft-light'; c.globalAlpha = cold * 1.6; c.fillStyle = '#9cc6ff'; c.fillRect(0, 0, w, h); }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  // cloud shadows drifting over the ground (they move with the world, so the ground slides under them as you walk)
  const cl = wxV('clouds');
  if (cl > 0 && !inside) {
    const drift = T * 18 * Math.max(1, wind * 0.6), S = 360 * z;
    for (let i = 0; i < 9; i++) {
      const bx = ((i * 431 + drift * z - wx0 * z) % (w + S * 2) + w + S * 2) % (w + S * 2) - S, by = ((i * 277 + i * i * 53 - wy0 * z * 0.98) % (h + S) + h + S) % (h + S) - S / 2, r = (190 + (i * 37) % 130) * z;
      const g = c.createRadialGradient(bx, by, 0, bx, by, r); g.addColorStop(0, `rgba(20,30,50,${0.38 * cl})`); g.addColorStop(1, 'rgba(20,30,50,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(bx, by, r * 1.5, r * 0.85, 0, 0, 6.3); c.fill();
    }
  }
  // sun rays from the top left
  const rays = wxV('rays');
  if (rays > 0 && !inside) {
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const a = 0.55 + i * 0.16 + Math.sin(T * 0.3 + i) * 0.03, len = Math.hypot(w, h) * 1.2, wd = 0.035 + 0.02 * Math.sin(T * 0.5 + i * 2);
      const g = c.createLinearGradient(-40, -40, Math.cos(a) * len, Math.sin(a) * len); g.addColorStop(0, `rgba(255,236,170,${0.16 * rays})`); g.addColorStop(1, 'rgba(255,236,170,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-40, -40); c.lineTo(Math.cos(a - wd) * len, Math.sin(a - wd) * len); c.lineTo(Math.cos(a + wd) * len, Math.sin(a + wd) * len); c.closePath(); c.fill(); }
    const g = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.5); g.addColorStop(0, `rgba(255,240,190,${0.22 * rays})`); g.addColorStop(1, 'rgba(255,240,190,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
  }
  // rain: slanted streaks, and splashes rippling on the ground
  if (rain > 0.01 && !inside) {
    const want = Math.round(1150 * rain * (w * h) / (1280 * 720)), R = WX.rain, vx = (90 + 380 * slant) * Math.sign(wind || 1), vy = 900;
    while (R.length < want) R.push({ x: wxRand() * (w + 200) - 100, y: wxRand() * h, l: 12 + wxRand() * 16, s: 0.75 + wxRand() * 0.5 });
    if (R.length > want) R.length = want;
    c.strokeStyle = 'rgba(210,222,240,0.62)'; c.lineWidth = 1.3; c.beginPath();
    for (const d of R) { d.x += vx * d.s * dt; d.y += vy * d.s * dt; if (d.y > h + 20 || d.x > w + 120 || d.x < -120) { d.y = -20 - wxRand() * 60; d.x = wxRand() * (w + 200) - 100; if (wxRand() < 0.35) WX.splash.push({ x: wxRand() * w, y: wxRand() * h, t: now }); }
      const k = d.l / Math.hypot(vx, vy); c.moveTo(d.x, d.y); c.lineTo(d.x - vx * k, d.y - vy * k); }
    c.stroke();
    c.strokeStyle = 'rgba(220,232,250,0.5)'; c.lineWidth = 1;
    for (let i = WX.splash.length - 1; i >= 0; i--) { const s = WX.splash[i], a = (now - s.t) / 420; if (a > 1) { WX.splash.splice(i, 1); continue; }
      c.globalAlpha = 1 - a; c.beginPath(); c.ellipse(s.x, s.y, 1.5 + a * 6 * z * 0.5, 0.6 + a * 2.2 * z * 0.5, 0, 0, 6.3); c.stroke(); }
    c.globalAlpha = 1; if (WX.splash.length > 300) WX.splash.splice(0, WX.splash.length - 300);
  } else if (rain > 0.01 && inside) { WX.splash.length = 0; }
  // snow: slow drifting flakes, some near and big, some far and small
  if (snow > 0.01 && !inside) {
    const want = Math.round(420 * snow * (w * h) / (1280 * 720)), S2 = WX.snow;
    while (S2.length < want) S2.push({ x: wxRand() * w, y: wxRand() * h, r: 0.8 + wxRand() * 2.2, ph: wxRand() * 6.3 });
    if (S2.length > want) S2.length = want;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (const f of S2) { f.y += (18 + f.r * 16) * dt; f.x += (Math.sin(T * 0.8 + f.ph) * 14 + (wind - 1) * 30) * dt * (0.5 + f.r * 0.3); if (f.y > h + 5) { f.y = -5; f.x = wxRand() * w; } if (f.x > w + 5) f.x = -5; if (f.x < -5) f.x = w + 5;
      c.globalAlpha = 0.5 + f.r * 0.18; c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.3); c.fill(); }
    c.globalAlpha = 1;
  }
  // wind: leaves and streaks of dust blowing across
  const lv = wxV('leaves'), dust = wxV('dust');
  if ((lv > 0.01 || dust > 0.01) && !inside) {
    const want = Math.round(80 * lv + 40 * dust), L = WX.leaves, cols = ['#7fb04a', '#a8c45a', '#c9a24a', '#5f9a3a'];
    while (L.length < want) L.push({ x: -20 - wxRand() * w * 0.5, y: wxRand() * h, s: 0.6 + wxRand() * 0.8, ph: wxRand() * 6.3, leaf: wxRand() < lv / Math.max(0.01, lv + dust), col: cols[Math.floor(wxRand() * 4)] });
    if (L.length > want) L.length = want;
    for (const q of L) { const gust = 0.6 + 0.4 * Math.sin(T * 0.7 + q.ph); q.x += (220 + 260 * gust) * q.s * dt; q.y += Math.sin(T * 3 + q.ph) * 30 * dt; if (q.x > w + 30) { q.x = -20 - wxRand() * 200; q.y = wxRand() * h; }
      if (q.leaf) { c.save(); c.translate(q.x, q.y); c.rotate(T * 6 * q.s + q.ph); c.fillStyle = q.col; c.globalAlpha = 0.9; c.beginPath(); c.ellipse(0, 0, 4.4 * q.s * Math.max(1, z * 0.7), 2 * q.s * Math.max(1, z * 0.7), 0, 0, 6.3); c.fill(); c.restore(); }
      else { c.strokeStyle = 'rgba(235,225,200,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - 40 * q.s, q.y + 1); c.stroke(); } }
  }
  // fog: soft banks drifting by, thicker at the edges
  const fog = wxV('fog');
  if (fog > 0.01 && !inside) {
    for (let i = 0; i < 7; i++) { const bx = ((i * 263 + T * (12 + i * 3) - wx0 * z * 0.6) % (w + 600) + w + 600) % (w + 600) - 300, by = (i * 151) % Math.max(1, h), r = 260 + (i * 71) % 160;
      const g = c.createRadialGradient(bx, by, 0, bx, by, r); g.addColorStop(0, `rgba(225,230,236,${0.42 * fog})`); g.addColorStop(1, 'rgba(225,230,236,0)'); c.fillStyle = g; c.fillRect(bx - r, by - r, r * 2, r * 2); }
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7); v.addColorStop(0, 'rgba(220,226,232,0)'); v.addColorStop(1, `rgba(220,226,232,${0.75 * fog})`); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }
  // lightning: now and then the sky goes white, and the thunder follows
  if (wxV('bolts') > 0.5) {
    if (!WX.nextBolt) WX.nextBolt = now + 3000 + wxRand() * 6000;
    if (now >= WX.nextBolt) { WX.flash = 1; WX.nextBolt = now + 5000 + wxRand() * 9000; WX.flash2 = now + 120; wxThunder(0.4 + wxRand() * 1.6); }
  } else WX.nextBolt = 0;
  if (WX.flash > 0) { c.fillStyle = `rgba(235,240,255,${0.55 * WX.flash})`; c.fillRect(0, 0, w, h); WX.flash = Math.max(0, WX.flash - dt * 4.5); if (WX.flash2 && now > WX.flash2 && WX.flash < 0.35) { WX.flash = 0.7; WX.flash2 = 0; } }
  c.restore();
}
