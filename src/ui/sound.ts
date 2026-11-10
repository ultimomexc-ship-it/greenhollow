/* ================= Sound (src/ui/sound.ts) =================
   Everything is made in the browser with the Web Audio API (no files): short synthesised sounds for what happens (steps by surface, digging, ore, stairs, building, pushing, trees and rocks, the harvest),
   and a quiet bed of ambience (wind, birds by day, crickets at night, water near the shore, and underground a low drone, drips and the crackle of torches). Sounds made away from you are
   softer the farther they are (sndAt). The audio starts on your first key or click (browsers insist) and **M** mutes it (remembered in `gh.mute`). The tests set GH_NOSOUND. */
const SND: any = { ctx: null, master: null, on: true, noiseBuf: null, last: {}, amb: null, nextBird: 0, nextDrip: 0, nextCricket: 0, nextWave: 0, dead: false };
try { SND.on = localStorage.getItem('gh.mute') !== '1'; } catch (e) {}
function sndInit(): boolean {
  if (SND.dead || (window as any).GH_NOSOUND) return false; if (SND.ctx) return true;
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) { SND.dead = true; return false; }
    const c = new AC(); SND.ctx = c; SND.master = c.createGain(); SND.master.gain.value = SND.on ? 0.55 : 0; SND.master.connect(c.destination);
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; SND.noiseBuf = b;
    return true;
  } catch (e) { SND.dead = true; return false; }
}
const sndReady = () => !!SND.ctx && SND.on && SND.ctx.state === 'running';
/** a short tone: frequency (sliding to `to`), length, wave, volume */
function sndTone(f: number, dur: number, type: any = 'sine', vol = 0.15, to?: number, at = 0) {
  if (!sndReady()) return; const c = SND.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(SND.master); o.start(t); o.stop(t + dur + 0.02);
}
/** a burst of noise through a filter (sweeping to `to`): scrapes, thuds, steps */
function sndNoise(dur: number, filt: any, f: number, vol = 0.12, to?: number, at = 0) {
  if (!sndReady()) return; const c = SND.ctx, t = c.currentTime + at, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = SND.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4; fl.type = filt; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur); fl.Q.value = filt === 'bandpass' ? 1.4 : 0.7;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(SND.master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
/** loudness of something that happens at (x, y): full beside you, none past about 20 tiles, and none from another level */
function sndAt(x: number, y: number): number {
  const p = game.player; if (!p) return 0.6; if (town && town.h0 && lvlOf(y) !== lvlOf(p.y)) return 0; const d = Math.hypot(x - p.x, y - p.y); return Math.max(0, 1 - d / 20);
}
const sndThrottle = (k: string, ms: number) => { const now = performance.now(); if (now - (SND.last[k] || -1e9) < ms) return false; SND.last[k] = now; return true; };

/* ---- the sounds ---- */
function sndStep(n) {
  if (!sndReady() || !n || !sndThrottle('step', 110)) return; const t = grid[n.ty] && grid[n.ty][n.tx], inRoom = roomAt[n.ty] && roomAt[n.ty][n.tx] >= 0, mine = isMineY(n.ty), deck = isUpperY(n.ty);
  const v = 0.55 + Math.random() * 0.3;
  if (inRoom || t === T.FLOOR) { sndNoise(0.05, 'bandpass', 380 + Math.random() * 120, 0.05 * v); sndTone(150 + Math.random() * 30, 0.05, 'triangle', 0.03 * v, 90); }   // boards
  else if (mine || t === T.DIRTF) sndNoise(0.07, 'lowpass', 520, 0.07 * v, 250);                                                                                    // packed dirt
  else if (deck || t === T.STAIR || t === T.STAIRU) { sndNoise(0.03, 'highpass', 2600, 0.04 * v); sndTone(520 + Math.random() * 60, 0.03, 'square', 0.015 * v, 380); }   // stone
  else if (t === T.SAND) sndNoise(0.09, 'lowpass', 1100, 0.05 * v, 500);
  else if (t === T.PATH) sndNoise(0.06, 'bandpass', 1500, 0.045 * v);
  else sndNoise(0.08, 'bandpass', 800 + Math.random() * 200, 0.04 * v, 420);                                                                                        // grass
}
function sndStairs(up: boolean) { if (!sndReady()) return; for (let i = 0; i < 4; i++) { const f = up ? 160 + i * 25 : 240 - i * 25; sndTone(f, 0.07, 'triangle', 0.09, f * 0.7, i * 0.07); sndNoise(0.05, 'bandpass', 420, 0.05, undefined, i * 0.07); } }
function sndDig(vol = 1) { if (!sndReady() || vol <= 0) return; sndNoise(0.14, 'lowpass', 700, 0.16 * vol, 180); sndTone(95, 0.12, 'sine', 0.14 * vol, 55); sndNoise(0.05, 'highpass', 3200, 0.05 * vol, undefined, 0.03); }
function sndOre(vol = 1) { if (!sndReady() || vol <= 0) return; sndTone(1318, 0.18, 'triangle', 0.1 * vol, undefined, 0.05); sndTone(1760, 0.22, 'sine', 0.08 * vol, undefined, 0.11); sndTone(2637, 0.14, 'sine', 0.04 * vol, undefined, 0.16); }
function sndPlace(vol = 1) { if (!sndReady() || vol <= 0) return; sndTone(230, 0.09, 'square', 0.08 * vol, 130); sndNoise(0.06, 'bandpass', 600, 0.08 * vol); }
function sndPush(vol = 1) { if (!sndReady() || vol <= 0 || !sndThrottle('push', 160)) return; sndNoise(0.14, 'bandpass', 380, 0.09 * vol, 220); }
function sndWork(kind: string, vol = 1) {
  if (!sndReady() || vol <= 0) return;
  if (kind === 'fall') { sndNoise(0.35, 'lowpass', 1800, 0.12 * vol, 300); sndTone(70, 0.4, 'sine', 0.14 * vol, 40, 0.18); }    // a tree comes down
  else if (kind === 'split') { sndNoise(0.06, 'highpass', 2400, 0.1 * vol); sndTone(1500, 0.08, 'triangle', 0.06 * vol, 900); sndNoise(0.12, 'lowpass', 600, 0.1 * vol, 200, 0.05); }   // a rock breaks
  else sndNoise(0.08, 'bandpass', 900, 0.07 * vol);
}
function sndPick(vol = 1) { if (!sndReady() || vol <= 0) return; sndTone(520, 0.08, 'sine', 0.09 * vol, 780); sndTone(780, 0.1, 'sine', 0.06 * vol, undefined, 0.06); }
function sndMagic() { if (!sndReady()) return; for (let i = 0; i < 6; i++) sndTone(300 + i * 140 + Math.random() * 60, 0.5, 'sine', 0.06, 200 + i * 220, i * 0.09); }
function sndSay() { if (!sndReady() || !sndThrottle('say', 80)) return; sndTone(420 + Math.random() * 160, 0.05, 'sine', 0.04, 330); }

/* ---- the ambience ---- */
function sndAmbientInit() {
  const c = SND.ctx; if (!c || SND.amb) return; const mk = (f: number, q = 0.6) => { const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = SND.noiseBuf; s.loop = true; fl.type = 'lowpass'; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(SND.master); s.start(); return { g, fl }; };
  SND.amb = { wind: mk(420), drone: mk(110, 1.2), shore: mk(900, 0.4) };
}
function sndAmbient(now: number, hour: number) {
  if (!sndReady() || !SND.on) return; const p = game.player; if (!p || typeof town === 'undefined' || !town) return; sndAmbientInit(); const A = SND.amb; if (!A) return; const c = SND.ctx, t = c.currentTime;
  const mine = isMineY(p.ty), inRoom = roomAt[p.ty] && roomAt[p.ty][p.tx] >= 0, outdoors = !mine && !inRoom, day = hour >= 6 && hour < 19;
  let near = 0; if (!mine && town.hgt) for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) { const y = p.ty + dy, x = p.tx + dx; if (grid[y] && grid[y][x] === T.WATER) near = Math.max(near, 1 - Math.hypot(dx, dy) / 9); }
  const wind = outdoors ? 0.05 + 0.02 * Math.sin(now / 3100) + 0.015 * Math.sin(now / 1300) : inRoom ? 0.012 : 0, shore = outdoors ? Math.max(0, near) * 0.07 * (0.7 + 0.3 * Math.sin(now / 2300)) : 0, drone = mine ? 0.05 : 0;
  A.wind.g.gain.setTargetAtTime(wind, t, 0.8); A.wind.fl.frequency.setTargetAtTime(380 + 160 * Math.sin(now / 4000), t, 0.5); A.shore.g.gain.setTargetAtTime(shore, t, 0.8); A.drone.g.gain.setTargetAtTime(drone, t, 1.2);
  if (outdoors && day && now > SND.nextBird) { SND.nextBird = now + 2500 + Math.random() * 7000; const f = 2200 + Math.random() * 1400, k = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < k; i++) sndTone(f + i * 120, 0.07, 'sine', 0.025, f * 1.35 + i * 100, i * 0.1); }
  if (outdoors && !day && now > SND.nextCricket) { SND.nextCricket = now + 600 + Math.random() * 900; const f = 4300 + Math.random() * 300; for (let i = 0; i < 3; i++) sndTone(f, 0.04, 'sine', 0.012, undefined, i * 0.07); }
  if (outdoors && near > 0.3 && now > SND.nextWave) { SND.nextWave = now + 3500 + Math.random() * 3500; sndNoise(1.6, 'lowpass', 500, 0.05 * near, 1400); }
  if (mine && now > SND.nextDrip) { SND.nextDrip = now + 2200 + Math.random() * 5000; const f = 1500 + Math.random() * 900; sndTone(f, 0.12, 'sine', 0.05, f * 0.55); sndTone(f * 0.5, 0.2, 'sine', 0.02, f * 0.3, 0.09); }
  if (mine && town.props && sndThrottle('crackle', 380)) { let best = 99; for (const pr of town.props) if (pr.kind === 'torch') { const d = Math.hypot(pr.x - p.x, pr.y - p.y); if (d < best) best = d; } if (best < 12) { const v = (1 - best / 12) * 0.05; sndNoise(0.03 + Math.random() * 0.05, 'highpass', 2500 + Math.random() * 2000, v); if (Math.random() < 0.3) sndNoise(0.02, 'highpass', 4000, v * 0.7, undefined, 0.06); } }
}
/* ---- starting, and the mute key ---- */
function sndStart() { if (sndInit() && SND.ctx.state === 'suspended') SND.ctx.resume(); }
function sndMute(on?: boolean) { SND.on = on === undefined ? !SND.on : on; try { localStorage.setItem('gh.mute', SND.on ? '0' : '1'); } catch (e) {} if (SND.master) SND.master.gain.setTargetAtTime(SND.on ? 0.55 : 0, SND.ctx.currentTime, 0.05); if (typeof playerSay === 'function' && game.player && sndReady() !== undefined) playerSay(game.player, SND.on ? 'Sound on.' : 'Sound off.'); }
for (const ev of ['keydown', 'pointerdown', 'touchstart']) window.addEventListener(ev, () => sndStart(), { passive: true } as any);
window.addEventListener('keydown', (e: any) => { if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) sndMute(); });
