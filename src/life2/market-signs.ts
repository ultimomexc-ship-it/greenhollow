/* Market stalls tell you what they sell and whether they are open: the seed stall and the greengrocer have their own look (art/painters.ts `stall_seed_*`, `stall_veg_*`),
   and a small board on the counter says OPEN or CLOSED (drawStallSigns). The kind comes from the keeper's shop (`noun` of its def). */
function stallKindAt(x: number, y: number): string {
  if (typeof town === 'undefined' || !town || !town.stalls) return '';
  for (const st of town.stalls) { if (st.gone || !st.tiles) continue; for (const t of st.tiles) if (t.x === x && t.y === y) { const m = st.owner && st.owner.shop; const noun = m && m.def && m.def.noun; return noun === 'seed stall' ? 'seed' : noun === 'greengrocer' ? 'veg' : ''; } }
  return '';
}
function drawStallSigns(c: any, now: number) {
  if (!town || cam.z < 0.8 || !merchants) return; const v = gaView(), u = TS / 24;
  for (const m of merchants) {
    const st = m.post; if (!st || st.gone || !st.tiles || !st.tiles[0]) continue; const t = st.tiles[0]; if (t.x < v.x0 - 1 || t.x >= v.x1 || t.y < v.y0 || t.y >= v.y1) continue;
    if (typeof canSee === 'function' && !canSee(t.x, t.y)) continue;
    const open = m.serving || (typeof isOpen === 'function' && isOpen(m)) || (typeof HAMLET_TRADER_DEF !== 'undefined' && m.def === HAMLET_TRADER_DEF && !(typeof paullusOut === 'function' && paullusOut(m.n) && !tut2Active())), px = t.x * TS, py = t.y * TS;   // (the Hamlet's trader shuts only while he is out walking at night)
    c.fillStyle = '#2a2332'; c.fillRect(px + 14.6 * u, py + 15.2 * u, 9.2 * u, 4.6 * u);
    c.fillStyle = open ? '#4f9a4a' : '#b8453c'; c.fillRect(px + 15 * u, py + 15.6 * u, 8.4 * u, 3.8 * u);
    c.fillStyle = '#fff6dc'; c.font = 'bold ' + ((open ? 2.3 : 1.85) * u) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(open ? 'OPEN' : 'CLOSED', px + 19.2 * u, py + 17.5 * u);
    c.fillStyle = '#2a2332'; c.fillRect(px + 18.9 * u, py + 14.2 * u, 0.5 * u, 1.2 * u);   // the cord it hangs by
  }
  c.textAlign = 'center';
}
