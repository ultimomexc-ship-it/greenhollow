/* ================= social2 / sb-presim: the village's life before the player arrives =================
   A fast, abstract run of the same social life (sb-exchange) and life events (sb-life) over the weeks before day 1: meals with the family,
   work with colleagues, people met in the street, evenings at the tavern. Relationships form, gossip circulates and changes, loans are
   made and broken, rows happen, people fall ill and recover, secrets slip. No walking and no pathfinding, so it takes a fraction of a second.
   It is seeded from the town seed, so the same seed always gives the same history.                                                     */
const SB_PRESIM_DAYS = 60;
function sbPresimSlot(slot, adults, R) {
  const groups: any[][] = [];
  if (slot === 12 || slot === 19) { const byHome = new Map(); for (const n of adults) { const k = n.homeRoom ? n.homeRoom.id : 'tent' + n.id; if (!byHome.has(k)) byHome.set(k, []); byHome.get(k).push(n); } groups.push(...byHome.values()); }
  if (slot === 9 || slot === 15) { const byWork = new Map(); for (const n of adults) { const j = n.job || n.cur; if (!j || j === 'Child' || j === 'Elder') continue; const k = (LF2_JOBS[j] && LF2_JOBS[j].room) || j; if (!byWork.has(k)) byWork.set(k, []); byWork.get(k).push(n); } groups.push(...byWork.values());
    for (const n of adults) if (R() < 0.35) { const other = adults[Math.floor(R() * adults.length)]; if (other !== n) groups.push([n, other]); } }
  if (slot === 21) { const tav = adults.filter(n => n.age >= 18 && R() < 0.15 + 0.15 * (sbHas(n, 'sociable') + sbHas(n, 'jovial')) - 0.1 * sbHas(n, 'homebody')); if (tav.length > 1) groups.push(tav); }
  for (const g of groups) {
    if (g.length < 2) continue; const pairs = Math.min(g.length, 1 + Math.floor(g.length / 2));
    for (let i = 0; i < pairs; i++) { const a = g[Math.floor(R() * g.length)], b = g[Math.floor(R() * g.length)]; if (a === b) continue;
      if (R() > 0.55 * sbSocial(a)) continue; const last = SB.pair.get(sbPairKey(a, b)); if (last !== undefined && game.time - last < 90) continue;
      sbExchange(a, b, { witnesses: g.filter(x => x !== a && x !== b).map(x => x.id), place: slot === 21 ? 'tavern' : slot === 12 || slot === 19 ? 'home' : 'work' }); }
  }
}
/** the weeks before change who is flush and who is skint, but not how much money the village has (that is the economy's business) */
function sbPresimMoney(coin0: Map<any, number>) {
  const ppl = [...coin0.keys()].filter(n => !n.dead), d = ppl.map(n => (n.coin || 0) - coin0.get(n)), mean = d.reduce((s, x) => s + x, 0) / Math.max(1, ppl.length);
  ppl.forEach((n, i) => { n.coin = Math.max(0, Math.round(coin0.get(n) + (d[i] - mean) * 0.5)); });
}
function sbPresim(days = SB_PRESIM_DAYS) {
  if (!town || town.sbPresim) return town && town.sbPresim;
  const t0 = performance.now(), mr = Math.random, R = cvRng((town.seed || 'x') + ':presim'); Math.random = R;
  const coin0 = new Map(npcs.map(n => [n, n.coin || 0])), time0 = game.time, poses = new Map(npcs.map(n => [n, n.pose])), chron0 = town.chron.length, ev0 = lf2Ev().length;
  SB.presim = true; for (const n of npcs) if (!n.dead) n.pose = 'stand';
  try {
    cvWorld();
    const base = time0 - days * 1440;
    for (let d = 0; d < days; d++) {
      const adults = npcs.filter(n => !n.dead && !n.infant && n.age >= 6);
      game.time = base + d * 1440 + 8 * 60; sbLifeDaily();
      for (const n of adults) { if (n.age < 16) continue; const j = n.job || n.cur; if (j && j !== 'Child' && j !== 'Elder') n.coin = (n.coin || 0) + (R() < 0.7 ? 1 + Math.floor(R() * 3) : 0);
        if ((lf2Has(n, 'jovial') || lf2Has(n, 'greedy') || lf2Has(n, 'sociable')) && R() < 0.12) n.coin = Math.max(0, (n.coin || 0) - 3 - Math.floor(R() * 6)); if (R() < 0.08) n.coin = Math.max(0, (n.coin || 0) - 2 - Math.floor(R() * 4)); }
      for (const slot of [9, 12, 15, 19, 21]) { game.time = base + d * 1440 + slot * 60; sbPresimSlot(slot, adults, R); }
      game.time = base + d * 1440 + 23 * 60; if (typeof lf2RomanceDaily === 'function') { try { lf2RomanceDaily(); } catch (e) {} }
      game.time = base + (d + 1) * 1440 + 3 * 60; sbDaily();
    }
  } finally { Math.random = mr; game.time = time0; SB.presim = false; poses.forEach((p, n) => { n.pose = p; }); town.chron.splice(chron0); sbPresimMoney(coin0); for (const n of npcs) { n.ill = n.ill && n.ill.until > game.time ? n.ill : null; } }
  return (town.sbPresim = { days, ms: Math.round(performance.now() - t0), events: lf2Ev().length - ev0, exchanges: Object.assign({}, SB.count) });
}
