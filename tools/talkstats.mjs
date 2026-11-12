/* Talk statistics: run an island for some days and report how the talk is doing (coverage of acts, variety of words, repeated pairs).
   node tools/talkstats.mjs [days=4] [scenario=farm] [--people=50] [--file=dist/index.html]
   --people=N fills the island up to N villagers first (visitors come ashore), then times the days: the result has msPerGameDay. */
import { chromium } from 'playwright';
import path from 'path';
const args = process.argv.slice(2), days = +(args.find(a => /^\d+$/.test(a)) || 4), scenario = args.find(a => /^[a-z]+$/.test(a)) || 'farm';
const people = +((args.find(a => a.startsWith('--people=')) || '--people=0').slice(9));
const file = (args.find(a => a.startsWith('--file=')) || '--file=dist/index.html').slice(7);
const b = await chromium.launch(); const page = await b.newPage(); page.on('pageerror', e => console.log('ERR', e.message));
await page.addInitScript(() => { window.GH_NOSAVE = true; window.GH_NOSOUND = true; });
await page.goto('file://' + path.resolve(file)); await page.waitForTimeout(1500);
const r = await page.evaluate(([days, scenario, people]) => {
  newTown('stats', scenario); TALK.words = true; MODS.all && scenario !== 'farm' && 0;
  let guard = 0; while (people && npcs.filter(n => !n.dead).length < people && guard++ < 80) { try { visArrive(); } catch (e) { break; } }
  const t0 = performance.now();
  for (let t = 0; t < days * 1440; t += 2) { updateSim(2); drainEvents(performance.now() + 1e6); }
  const ms = performance.now() - t0;
  const log = TALK.log, acts = {}, pairs = {}, lines = [];
  for (const l of log) { for (const a of l.acts || []) acts[a.act] = (acts[a.act] || 0) + 1; const k = [l.a, l.b].sort().join('-'); pairs[k] = (pairs[k] || 0) + 1; for (const t of l.lines || []) lines.push(t.replace(/^[^:]+: /, '')); }
  const defined = Object.keys(ACTS).filter(k => !ACTS[k].reply), never = Object.keys(ACTS).filter(k => !acts[k]);
  const uniq = new Set(lines).size, top = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { people: npcs.filter(n => !n.dead).length, msPerGameDay: Math.round(ms / days), conversations: log.length, lines: lines.length, uniqueLines: uniq, uniqueRatio: +(uniq / Math.max(1, lines.length)).toFixed(2), actsUsed: Object.keys(acts).length, actsDefined: Object.keys(ACTS).length, neverUsed: never, mostFrequentPairs: top, byKind: Object.fromEntries(Object.entries(acts).sort((a, b) => b[1] - a[1]).slice(0, 12)) };
}, [days, scenario, people]);
console.log(JSON.stringify(r, null, 1)); await b.close();
