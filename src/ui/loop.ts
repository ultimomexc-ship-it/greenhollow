/* ---------- loop ---------- */
let last = performance.now();
/* when you are at a wedding, funeral, party or bonfire, the clock slows to one game minute per second */
function eventSlow() {
  const n = game.player; if (!n || !n.player || n.player.sleeping || state.speed > 3) return 1;
  const t = game.time, near = (x, y, r) => Math.abs(n.tx - x) + Math.abs(n.ty - y) <= r;
  const w = town.wedding, f = town.funeral, pt = typeof activeParty === 'function' && activeParty(), fe = town.feast;
  const on = (w && !w.done && t >= w.at - 15 && t < w.end && near((w.place || {}).x, (w.place || {}).y, 14))
    || (f && !f.done && t >= f.at - 15 && t < f.end && near(f.slot.x, f.slot.y, 14))
    || (pt && t >= pt.at - 15 && near(cakeTile().x, cakeTile().y, 14))
    || (fe && t >= fe.at - 10 && t < fe.end && near(town.cx, town.cy + 1, 14));
  state.slowed = !!on;
  return on ? Math.min(1, 1 / (state.rate * state.speed)) : 1;
}
function frame(now) {
  if (!town) { requestAnimationFrame(frame); return; }   // (an island is still being loaded)
  const dt = Math.min(100, now - last) / 1000; last = now;
  if (!game.player && game.steer != null && !town.succession && !skipping) {   // you always steer the same person: take the reins back if anything let go of them
    const t = byId(game.steer); if (t && !t.dead && !t.infant && t.age >= 8) { if (!canControl(t)) t.role = t.age >= 60 ? 'Elder' : 'Worker'; startPlaying(t); }
  }
  { const sl = game.player && game.player.player && game.player.player.sleeping;
    if (sl && state.sleepFast == null && state.speed > 0) { state.sleepFast = String(state.speed); const b: any = document.querySelector('[data-speed="100"]'); if (b) b.click(); }
    else if (!sl && state.sleepFast != null) { const b: any = document.querySelector('[data-speed="' + state.sleepFast + '"]'); state.sleepFast = null; if (b) b.click(); } }
  try {
  if (typeof tut2Tick === 'function') tut2Tick(dt);   // (the tutorial runs on real time)
  if (state.speed > 0 && !(town && town.decision)) {   // (a decision about your own life stops the clock until you make it)
    let m = dt * state.rate * state.speed; const t0 = performance.now();
    while (m > 0 && performance.now() - t0 < 14) { const s = Math.min(m, 2); updateSim(s); m -= s; }
  }
  drainEvents(now); mealNudge(); idleRelease(now); drawClock(now);
  } catch (e) { if (!(frame as any).warnedSim) { (frame as any).warnedSim = true; console.error('sim error', e); } }
  try { render(now, dt, (game.time % 1440) / 60); } catch (e) { if (!(frame as any).warned) { (frame as any).warned = true; console.error('render error', e); } try { const cx = canvas.getContext('2d'); cx.restore && cx.setTransform(1, 0, 0, 1, 0, 0); } catch (e2) {} }
  try { updateUI(false); } catch (e) { console.error('ui error', e); }
  requestAnimationFrame(frame);
}
if (window.ResizeObserver) new ResizeObserver(() => { if (town) sizeCanvas(); }).observe(canvas); else window.addEventListener('resize', () => { if (town) sizeCanvas(); });
if (typeof isleBoot === 'function') isleBoot(); else newTown(); requestAnimationFrame(frame);

const GNAME = g => (GOODS[g] && GOODS[g].name) || g;

