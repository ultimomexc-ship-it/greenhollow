// Audit of what people say on a blank island: runs a few days with a hut and several arrivals, records every line spoken, shouted,
// chronicled and told in conversation, and flags words for places that do not exist there (bakery, tavern, church, market ...).
//   node tools/blankwords.mjs [days] [people]
import { launch, openGame, simulate } from '../tests/lib.mjs';
const [days = 6, people = 5] = process.argv.slice(2);
const browser = await launch();
const { page, errors } = await openGame(browser, new URL('../dist/index.html', import.meta.url).pathname, { rng: 41, town: 'audit' });
await page.evaluate((people) => {
  newTown('audit-island', 'blank'); if (!town.props) lfInitProps(); town.bldQ = town.bldQ || []; startPlaying(npcs[0]); const P = game.player; itBuildToggle(P, true);
  const cx = P.tx + 4, cy = P.ty - 8, n = 6;
  for (let j = -3; j < 12; j++) for (let i = -4; i < 14; i++) { setT(cx + i, cy + j, T.GRASS); roomAt[cy + j][cx + i] = -1; const q = lfPropAt(cx + i, cy + j); if (q) { town.props = town.props.filter(z => z !== q); town.propAt.delete((cy + j) * W + cx + i); town.pblock[(cy + j) * W + cx + i] = 0; } }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (!(i === 0 || j === 0 || i === n - 1 || j === n - 1)) continue; lfAddProp(i === 2 && j === n - 1 ? 'bdoor' : 'bwall', cx + i, cy + j); }
  for (const [x, y] of [[1, 1], [3, 1], [4, 1], [1, 3], [3, 3], [4, 3]]) lfAddProp('bed', cx + x, cy + y);
  town.bldQ.push([cx, cy]); bldTick(); itBuildToggle(P, false);
  for (let i = 0; i < people; i++) visArrive();
  window.__said = []; window.__seenEv = new Set(); window.__chronN = 0;
  const p0 = playerSay; playerSay = function (n, t) { window.__said.push('you | ' + t); return p0.apply(this, arguments); };
  window.__collect = () => { for (const ev of game.events) { if (window.__seenEv.has(ev)) continue; window.__seenEv.add(ev); for (const l of ev.lines || []) window.__said.push('say | ' + (l.who && l.who.first) + ': ' + l.text); } for (; window.__chronN < town.chron.length; window.__chronN++) { const c = town.chron[window.__chronN]; window.__said.push('chron | ' + (c.text || c)); } };
}, Number(people));
for (let d = 0; d < Number(days); d++) for (let h = 0; h < 24; h++) { await simulate(page, 60); await page.evaluate(() => { window.__collect(); if (Math.random() < 0.3) for (const n of npcs) { if (n.player || n.dead) continue; const p = game.player; n.tx = n.x = p.tx + 2 + Math.floor(Math.random() * 3); n.ty = n.y = p.ty; n.moving = false; n.path = []; } }); }
const talks = await page.evaluate(async () => {
  const res = []; const p = game.player;
  for (const o of npcs.filter(q => q !== p && !q.dead && q.age >= 14).slice(0, 8)) {
    o.aff[p.id] = 30; o.know[p.id] = 40; o.pose = 'stand'; openTalk(o); const lines = [];
    for (let i = 0; i < 16; i++) { const t = document.getElementById('talk'); if (!t || t.hidden) break; const say = t.querySelector('.ta'); lines.push('talk | ' + o.first + ': ' + (say ? say.innerText : '')); const opts = [...t.querySelectorAll('[data-k]')]; if (!opts.length) break; opts[Math.floor(Math.random() * opts.length)].click(); }
    if (talkUI.o) closeTalk(); res.push(...lines);
  } return res;
});
const said = await page.evaluate(() => window.__said);
const all = [...said, ...talks];
const BAD = /\b(bakery|baker|taberna|tavern|inn|pub|barkeep|church|chapel|temple|shrine|priest|sermon|altar|pew|market|forum|stall|merchant|shopkeeper|shop|larder|caravan|trader|bath|baths|thermopolium|smithy|smith|forge|anvil|sawmill|mill|miller|jail|carcer|watch|guard|square|plaza|green|village|town|hall|road|pass|mountain|mountains|house|houses|neighbours?|street|lane|bridge|harbou?r|ship|boat|crowd|festival|feast|wedding|funeral|grave|graveyard|churchyard|farmers?)\b/i;
const hits = all.filter(l => BAD.test(l)); const seen = new Map();
for (const l of hits) { const k = l.replace(/\b[A-Z][a-z]+\b/g, 'N').slice(0, 140); seen.set(k, (seen.get(k) || 0) + 1); }
console.log(`${all.length} lines, ${hits.length} mention a place or a thing that may not exist (${seen.size} distinct):`);
for (const [k, c] of [...seen].sort((a, b) => b[1] - a[1]).slice(0, 80)) console.log(String(c).padStart(3), k);
if (errors.length) console.log('ERRORS', errors.slice(0, 3));
await browser.close();
