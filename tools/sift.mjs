// Story sifting experiment: run the village with no player, take the full event log, and look for story-shaped patterns.
// Answers: how much story material does the simulation produce, of which kinds, and what is missing?
//   node tools/sift.mjs [days] [seed]
import { launch, openGame, simulate } from '../tests/lib.mjs';

const [days = 30, seed = 'sift'] = process.argv.slice(2);
const browser = await launch();
const { page } = await openGame(browser, new URL('../dist/index.html', import.meta.url).pathname, { rng: 9, town: seed });
const all = new Map(); let names = {};
for (let d = 0; d < +days; d++) {
  await simulate(page, 1440);
  const r = await page.evaluate(() => ({ ev: lf2Ev().filter(e => e.t >= 0).map(e => ({ id: e.id, kind: e.kind, t: e.t, a: e.actor, g: e.target, tags: e.tags, sev: e.sev, fake: e.fake, w: (e.witnesses || []).length, know: (e.know || []).length, text: e.text, place: e.place, wrong: npcs.filter(n => n.kn && n.kn[e.id] && n.kn[e.id].a && n.kn[e.id].who != null && n.kn[e.id].who !== e.actor).length })),
    names: Object.fromEntries(npcs.map(n => [n.id, n.first])), fam: Object.fromEntries(npcs.map(n => [n.id, { sp: n.fam && (n.fam.spouse || n.fam.partner) || null }])) }));
  for (const e of r.ev) all.set(e.id, e); names = { ...names, ...r.names }; globalThis.fam = r.fam;
}
await browser.close();
const ev = [...all.values()].sort((a, b) => a.t - b.t), N = id => names[id] || '?', day = t => Math.floor(t / 1440);
const BAD = ['harm', 'violence', 'theft', 'deceit', 'nuisance', 'embarrass', 'sabotage', 'bribe', 'trespass', 'prank', 'debt'], GOOD = ['kindness', 'help', 'generous', 'honest'];
const isBad = e => e.tags.some(t => BAD.includes(t)), isGood = e => e.tags.some(t => GOOD.includes(t));

// ---- the base rate: what happens ----
const byKind = {}; for (const e of ev) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
console.log(`# Story sifting over ${days} days (seed ${seed})\n\n${ev.length} events (the log keeps the newest 1500; events from before arrival are left out; ${ev.length >= 1500 ? 'OLDER EVENTS WERE DROPPED, counts are a lower bound' : 'nothing dropped'})`);
console.log('By kind: ' + Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
const actors = new Set(ev.filter(e => e.a).map(e => e.a)); console.log(`Distinct people doing things: ${actors.size}; events per day: ${(ev.length / +days).toFixed(1)}`);

// ---- patterns ----
const stories = [];
const add = (kind, beats, who) => stories.push({ kind, beats, who, day: day(beats[beats.length - 1].t) });
for (let i = 0; i < ev.length; i++) { const a = ev[i]; if (!a.a || !a.g || a.fake) continue;
  for (let j = i + 1; j < ev.length; j++) { const b = ev[j]; if (b.t - a.t > 7 * 1440) break; if (b.fake) continue;
    if (isBad(a) && isBad(b) && b.a === a.g && b.g === a.a) { add('revenge', [a, b], [a.a, a.g]); break; }
    if (isGood(a) && isBad(b) && b.a === a.a && b.g === a.g) { add('betrayal', [a, b], [a.a, a.g]); break; }
    if (isBad(a) && isGood(b) && b.a === a.a && b.g === a.g) { add('redemption', [a, b], [a.a, a.g]); break; }
    if (isGood(a) && isGood(b) && b.a === a.g && b.g !== a.a && b.t - a.t < 1440) { add('paid forward', [a, b], [a.a, a.g, b.g]); break; }
    if (isBad(a) && ['arrest', 'fined'].includes(b.kind) && (b.g === a.a || b.a === a.a)) { add('caught', [a, b], [a.a]); break; } } }
// a bad week for one person
const victim = {}; for (const e of ev) if (e.g && isBad(e) && !e.fake) (victim[e.g] = victim[e.g] || []).push(e);
for (const id in victim) { const L = victim[id]; for (let i = 0; i + 2 < L.length; i++) if (L[i + 2].t - L[i].t < 7 * 1440) { add('a terrible week', L.slice(i, i + 3), [+id]); break; } }
// a feud getting worse: three or more bad acts between the same two people
const pair = {}; for (const e of ev) if (e.a && e.g && isBad(e) && !e.fake) { const k = [e.a, e.g].sort().join('-'); (pair[k] = pair[k] || []).push(e); }
for (const k in pair) if (pair[k].length >= 3) add('escalating feud', pair[k].slice(0, 4), k.split('-').map(Number));
// love triangles: romance aimed at someone with a partner, or jealousy
for (const e of ev) if ((e.tags.includes('romance') || e.kind === 'jealous' || e.kind === 'crush') && e.g && globalThis.fam[e.g] && globalThis.fam[e.g].sp && globalThis.fam[e.g].sp !== e.a) add('love triangle', [e], [e.a, e.g, globalThis.fam[e.g].sp]);
// money between two people: a loan that went bad, or a loan paid back
for (const a of ev) if (a.kind === 'loan') { const b = ev.find(e => (e.kind === 'default' || e.kind === 'repaid') && e.a === a.g && e.g === a.a && e.t > a.t); if (b) add(b.kind === 'default' ? 'a loan gone bad' : 'kept their word', [a, b], [a.a, a.g]); }
// a sickbed: somebody falls ill and somebody sits with them
for (const a of ev) if (a.kind === 'illness') { const b = ev.find(e => e.kind === 'comfort' && e.g === a.g && e.t > a.t && e.t - a.t < 4 * 1440); if (b) add('a sickbed vigil', [a, b], [a.g, b.a]); }
// the wrong person blamed: somebody believes a culprit who did not do it
for (const e of ev) if (e.wrong >= 1 && isBad(e)) add('the wrong person blamed', [e], [e.a]);
// rumours that outran the truth
for (const e of ev) if (e.fake && e.know >= 4) add('rumour outran the truth', [e], [e.a]);
// a public spectacle
for (const e of ev) if (e.w >= 6 && e.tags.some(t => ['embarrass', 'violence', 'scandal'].includes(t))) add('public spectacle', [e], [e.a, e.g].filter(Boolean));

const kinds = {}; for (const s of stories) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
console.log(`\n## Story-shaped patterns found: ${stories.length} (${(stories.length / (+days / 7)).toFixed(1)} per game week)\n`);
for (const k of ['revenge', 'betrayal', 'redemption', 'paid forward', 'caught', 'a terrible week', 'escalating feud', 'love triangle', 'rumour outran the truth', 'public spectacle', 'a loan gone bad', 'kept their word', 'a sickbed vigil', 'the wrong person blamed']) console.log(`- ${k}: ${kinds[k] || 0}`);
const people = new Set(stories.flatMap(s => s.who)); console.log(`\nDistinct people in stories: ${people.size} of ${Object.keys(names).length}`);
console.log('\n## Examples\n');
const seen = {}; for (const s of stories) { if ((seen[s.kind] = (seen[s.kind] || 0) + 1) > 2) continue; console.log(`- **${s.kind}** (day ${s.day}): ` + s.beats.map(b => `day ${day(b.t)}: ${b.text}`).join(' → ')); }
