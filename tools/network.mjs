// The social network, measured: the village at the player's arrival (after the pre-simulation), how news travels over the
// following week, how many versions of a story exist, how many beliefs are wrong, and how relationships look.
//   node tools/network.mjs [days] [seed]
import { launch, openGame, simulate } from '../tests/lib.mjs';

export async function networkRun({ days = 7, seed = 'network', rng = 5, file = null } = {}) {
  const browser = await launch();
  const { page, errors } = await openGame(browser, file || new URL('../dist/index.html', import.meta.url).pathname, { rng, town: seed });
  const snap = () => page.evaluate(() => {
    const live = npcs.filter(n => !n.dead && !n.infant && n.age >= 6), P = game.player, evs = lf2Ev();
    const pairs = []; for (const a of live) for (const b of live) if (a.id < b.id) pairs.push([a.aff[b.id] || 0, b.aff[a.id] || 0]);
    const versions = evs.map(ev => { const knowers = live.filter(n => n.kn && n.kn[ev.id]); const vs = new Set(knowers.map(n => { const k = n.kn[ev.id]; return (k.a ? (k.who != null ? k.who : ev.actor) : 'anon') + '|' + (k.ext || ''); }));
      const wrong = knowers.filter(n => { const k = n.kn[ev.id]; return k.a && k.who != null && k.who !== ev.actor; }).length; return { id: ev.id, kind: ev.kind, t: ev.t, know: knowers.length, versions: vs.size, wrong, fake: ev.fake, text: ev.text }; });
    return {
      presim: town.sbPresim || null, day: Math.floor(game.time / 1440), people: live.length,
      perPerson: live.filter(n => n !== P).map(n => ({ name: n.first, known: Object.keys(n.kn || {}).length, sbRel: Object.keys(n.sbRel || {}).length, strong: Object.values(n.aff).filter(v => Math.abs(v) > 25).length, reasons: Object.values(n.why || {}).reduce((s, a) => s + a.length, 0), conv: (n.sbConv || []).length, mods: (n.mods || []).length })),
      friends: pairs.filter(([x, y]) => x > 35 && y > 35).length, rivals: pairs.filter(([x, y]) => x < -25 && y < -25).length, oneSided: pairs.filter(([x, y]) => Math.abs(x - y) > 30).length, asym: pairs.reduce((s, [x, y]) => s + Math.abs(x - y), 0) / Math.max(1, pairs.length), pairs: pairs.length,
      loans: (town.sbLoans || []).reduce((m, l) => (m[l.state] = (m[l.state] || 0) + 1, m), {}), versions, exchanges: Object.assign({}, SB.count),
      ill: live.filter(n => n.ill && n.ill.until > game.time).map(n => n.first), secretsOut: live.filter(n => n.cvLife && n.cvLife.secretOut).length, secretsKnown: live.filter(n => n.cvLife && n.cvLife.secret && n.cvLife.secretKnownBy.length).length,
    };
  });
  const arrival = await snap(); const daily = [];
  for (let d = 0; d < days; d++) { await simulate(page, 1440); daily.push(await snap()); }
  await browser.close();
  return { arrival, daily, errors };
}
export function networkReport({ arrival: A, daily }) {
  const L = [], avg = (arr, f) => (arr.reduce((s, x) => s + f(x), 0) / Math.max(1, arr.length));
  L.push('# The village at the player\'s arrival', '');
  if (A.presim) L.push(`Pre-simulation: ${A.presim.days} days in ${A.presim.ms} ms, ${A.presim.events} events. Exchanges: ` + Object.entries(A.presim.exchanges || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
  else L.push('Pre-simulation: none');
  L.push(`Each villager knows on average ${avg(A.perPerson, p => p.known).toFixed(1)} things, holds ${avg(A.perPerson, p => p.sbRel).toFixed(1)} beliefs about how others feel about each other, has ${avg(A.perPerson, p => p.strong).toFixed(1)} strong feelings (friend or foe) with ${avg(A.perPerson, p => p.reasons).toFixed(1)} reasons, and remembers ${avg(A.perPerson, p => p.conv).toFixed(1)} recent conversations.`);
  L.push(`Blank slates (know nothing): ${A.perPerson.filter(p => p.known === 0).map(p => p.name).join(', ') || 'none'}`);
  L.push(`Pairs: ${A.pairs}; mutual friends ${A.friends}, mutual rivals ${A.rivals}, one-sided (|difference| > 30) ${A.oneSided}; mean asymmetry ${A.asym.toFixed(1)}`);
  L.push(`Loans: ${JSON.stringify(A.loans)}; ill now: ${A.ill.join(', ') || 'nobody'}; secrets someone else knows: ${A.secretsKnown}; secrets out: ${A.secretsOut}`);
  const circ = A.versions.filter(v => v.know >= 3); L.push(`Stories known by 3+ people: ${circ.length}; with more than one version: ${circ.filter(v => v.versions > 1).length}; with somebody blaming the wrong person: ${circ.filter(v => v.wrong > 0).length}`);
  L.push('', 'Most widely known stories:'); for (const v of A.versions.slice().sort((a, b) => b.know - a.know).slice(0, 8)) L.push(`- ${v.know} know (${v.versions} version${v.versions > 1 ? 's' : ''}${v.wrong ? ', ' + v.wrong + ' blame the wrong person' : ''}): ${v.text}`);
  // spread: events born on the first day after arrival, tracked over the week
  const born = daily[0] ? daily[0].versions.filter(v => v.t >= (daily[0].day - 1) * 1440) : [];
  if (born.length) { L.push('', `## How news travels (${born.length} events from the first day, by how many people know them)`, '', '| after | median knowers | most | versions (mean) |', '|---|---|---|---|');
    for (const [i, d] of daily.entries()) { const now = born.map(b => d.versions.find(v => v.id === b.id)).filter(Boolean), ks = now.map(v => v.know).sort((a, b) => a - b); L.push(`| ${i + 1} day${i ? 's' : ''} | ${ks[Math.floor(ks.length / 2)] || 0} | ${ks[ks.length - 1] || 0} | ${avg(now, v => v.versions).toFixed(2)} |`); } }
  const last = daily[daily.length - 1]; if (last) L.push('', `After ${daily.length} days: exchanges ${Object.entries(last.exchanges).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}; loans ${JSON.stringify(last.loans)}`);
  return L.join('\n');
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [days = 7, seed = 'network'] = process.argv.slice(2).filter(x => !x.startsWith('--')), t0 = Date.now(), r = await networkRun({ days: +days, seed });
  console.log(networkReport(r)); console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s${r.errors.length ? '; page errors: ' + r.errors.slice(0, 3).join(' | ') : ''})`);
}
