// Social integration check: does the conversation and social simulation still match the game?
//   node tools/integrate.mjs [--base=<git ref>] [--md=report.md] [--json=report.json] [--strict] [--file=dist/index.html]
// It reads the real game (the built page, headless) and the source, compares both with integration/registry.json, and reports:
//   added    game content no feature in the registry accounts for (with an automatic "can villagers see / hear / remember / judge / gossip / discuss it?")
//   removed  registry entries marked active that the game no longer has (with every place in the code that still depends on them)
//   dangling conversation tables keyed by things that exist neither in the game nor as history
//   touched  features whose code changed since --base (their integrations need a look)
//   gaps     active content with thin integration (opportunities, not errors)
// --strict exits 1 on added / removed / dangling. The playbook for acting on the report is docs/social-integration.md.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { launch, openGame } from '../tests/lib.mjs';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const REG = path.join(root, 'integration', 'registry.json');
const arg = (k, d = null) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : process.argv.includes(`--${k}`) ? true : d; };

/* ---------------- what the game has ---------------- */
function walk(dir, out = []) { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; }
const SRC = () => walk(path.join(root, 'src')).filter(f => f.endsWith('.ts'));
/** the tags an lfEmit call can give (handles "tags: cond ? ['a'] : ['b']") */
export function tagsIn(call) { const out = new Set(); for (const m of call.matchAll(/tags:\s*/g)) { const rest = call.slice(m.index + m[0].length), end = rest.search(/\]\s*(,\s*[a-zA-Z]+\s*:|\s*\})/); for (const b of rest.slice(0, end < 0 ? 120 : end + 1).matchAll(/\[([^\]]*)\]/g)) for (const t of (b[1].match(/'([^']+)'/g) || [])) out.add(t.replace(/'/g, '')); } return [...out]; }
/** event kinds the code can create, with where and how (the lfEmit call's options) */
export function staticEvents() {
  const evs = {};
  for (const f of SRC()) { const s = fs.readFileSync(f, 'utf8'), rel = path.relative(root, f);
    const re = /lfEmit\(\s*(?:'([a-zA-Z-]+)'|sp \? '([a-zA-Z-]+)' : '([a-zA-Z-]+)')/g; let m;
    while ((m = re.exec(s))) { const call = s.slice(m.index, m.index + 600), line = s.slice(0, m.index).split('\n').length;
      for (const k of [m[1], m[2], m[3]].filter(Boolean)) (evs[k] = evs[k] || []).push({ file: rel, line, call }); } }
  return evs;
}
/** the tables the game and the talk layer are built from, read from the running page */
export async function inventory(file) {
  const browser = await launch(); const { page, errors } = await openGame(browser, file, { rng: 3, town: 'integration' });
  const inv = await page.evaluate(() => {
    const keys = o => o ? Object.keys(o) : [];
    const work = { ...Object.fromEntries(keys(typeof AGENDA === 'object' ? AGENDA : {}).map(r => [r, 'task'])), ...Object.fromEntries(keys(ROLES).filter(r => !['Worker', 'Elder', 'Child'].includes(r)).map(r => [r, 'role'])), ...Object.fromEntries(keys(LF2_JOBS).map(j => [j, 'trade'])) };
    const places = [...new Set([...keys(LF2_SELL), ...keys(LF2_JOBS).map(j => LF2_JOBS[j].room).filter(Boolean)])];
    return {
      jobs: work, places, goods: keys(GOODS), sellers: keys(LF2_SELL),
      talk: { kindWord: keys(cvKindWord), jobNoun: keys(JOB_NOUN), jobVerb: keys(JOB_VERB), workTalk: keys(CV_WORKTALK), tags: keys(LF2_TAGS), activity: keys(CV_ACTV), says: keys(SB_SAY), convSay: keys(CV_CONVSAY), relWhy: keys(CV_RELWHY) },
      names: Object.fromEntries(keys(LF2_JOBS).map(j => [j, LF2_JOBS[j].name])), workText: Object.fromEntries(keys(LF2_JOBS).map(j => [j, !!LF2_JOBS[j].text])),
      tagInfo: Object.fromEntries(keys(LF2_TAGS).map(t => [t, { v: LF2_TAGS[t].v || 0, spice: LF2_TAGS[t].spice || 0, pity: LF2_TAGS[t].pity || 0 }])),
    };
  });
  // the tag group each event kind falls into in the talk rules (theft, romance, kind …; 'other' gets only generic lines)
  const tagsOf = Object.fromEntries(Object.entries(staticEvents()).map(([k, sites]) => [k, [...new Set(sites.flatMap(x => tagsIn(x.call)))]]));
  inv.groups = await page.evaluate(T => Object.fromEntries(Object.entries(T).map(([k, tags]) => [k, cvTagGroup({ kind: k, tags })])), tagsOf);
  await browser.close(); inv.errors = errors; return inv;
}

/* ---------------- who depends on a name ---------------- */
const LAYERS = [['dialogue', 'src/dialogue'], ['social simulation', 'src/social2'], ['events and gossip', 'src/life2'], ['other game code', 'src'], ['tests', 'tests'], ['tools', 'tools'], ['docs', 'docs'], ['notes', 'NOTES.md'], ['registry', 'integration']];
export function references(id, { skip = [] } = {}) {
  const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'tests')), ...walk(path.join(root, 'tools')), ...walk(path.join(root, 'docs')), path.join(root, 'NOTES.md'), path.join(root, 'CLAUDE.md')].filter(f => /\.(ts|mjs|md|json)$/.test(f) && !f.includes('integrate.mjs'));
  const re = new RegExp(`(['"\`]${id}['"\`]|\\b${id}\\b)`), out = [];
  for (const f of files) { const rel = path.relative(root, f); if (skip.some(s => rel.startsWith(s))) continue; const L = fs.readFileSync(f, 'utf8').split('\n');
    L.forEach((ln, i) => { if (re.test(ln)) out.push({ file: rel, line: i + 1, layer: (LAYERS.find(([, p]) => rel.startsWith(p)) || ['other'])[0], text: ln.trim().slice(0, 160) }); }); }
  return out;
}

/* ---------------- can villagers see it, hear of it, remember it, judge it, gossip, discuss it? ---------------- */
function assessEvent(kind, sites, inv) {
  const call = sites.map(s => s.call).join('\n'), tags = [...new Set(sites.flatMap(x => tagsIn(x.call)))];
  const known = tags.filter(t => inv.tagInfo[t]), unknown = tags.filter(t => !inv.tagInfo[t]), spice = Math.max(0, ...known.map(t => inv.tagInfo[t].spice)), judged = known.some(t => inv.tagInfo[t].v !== 0 || inv.tagInfo[t].pity > 0);
  const noWit = /witnessIds:\s*\[\]/.test(call), hidden = /aware:\s*false/.test(call), chron = /chron:\s*true/.test(call);
  const y = (ok, how) => ({ ok, how });
  return {
    see: y(!noWit, noWit ? 'nobody can witness it (witnessIds: [])' + (hidden ? ', not even the target' : '') : /witnessIds:/.test(call) ? 'the people the code names see it (witnessIds), plus the target' : 'people nearby witness it (lfEmit picks witnesses)'),
    hear: y(spice > 0 || known.length > 0, known.length ? `passed on as gossip (tags ${known.join(', ')}${spice ? `, spice ${spice}` : ''})` : 'no known tags, so nobody finds it worth repeating'),
    remember: y(true, 'every witness and listener keeps their own version (lf2Learn), kept or forgotten by importance (sbImp)'),
    opinion: y(judged, judged ? 'changes how people feel about those involved (tags with a value or pity in LF2_TAGS)' : 'no tag carries a judgement, so it changes no feelings'),
    gossip: y(spice >= 0.5, spice >= 0.5 ? 'juicy enough to travel (and change on the way)' : 'too dull to travel far'),
    talk: y(inv.talk.kindWord.includes(kind), inv.talk.kindWord.includes(kind) ? (inv.groups[kind] === 'other' ? `has a label, but its talk rules are the generic ones (tag group 'other')` : `has a label and talk rules (group ${inv.groups[kind]})`) : 'no label in cvKindWord: it will be called "business"'),
    tags, unknownTags: unknown, chron,
  };
}

/* ---------------- compare ---------------- */
export function compare(reg, evs, inv, { base } = {}) {
  const R = { added: [], removed: [], dangling: [], touched: [], gaps: [], historical: [], changedFiles: [] };
  const regOf = {}; for (const [fid, f] of Object.entries(reg.features)) for (const type of ['events', 'jobs', 'places', 'goods']) for (const e of f[type] || []) { const id = typeof e === 'string' ? e : e.id; regOf[type + ':' + id] = { feature: fid, status: (typeof e === 'object' && e.status) || f.status || 'active', note: typeof e === 'object' ? e.note : null }; }
  const game = { events: Object.keys(evs), jobs: Object.keys(inv.jobs), places: inv.places, goods: inv.goods };
  for (const type of Object.keys(game)) {
    for (const id of game[type]) { const r = regOf[type + ':' + id];
      if (!r) R.added.push({ type, id, where: type === 'events' ? evs[id].map(s => `${s.file}:${s.line}`) : [], assess: type === 'events' ? assessEvent(id, evs[id], inv) : null });
      else if (r.status === 'historical') R.dangling.push({ type, id, why: `the registry says ${type.slice(0, -1)} '${id}' is historical (no longer in the game), but the game still has it: mark it active again, or finish removing it` }); }
    for (const [k, r] of Object.entries(regOf)) { const [t, id] = k.split(':'); if (t !== type) continue; const has = game[type].includes(id);
      if (!has && r.status === 'active') R.removed.push({ type, id, feature: r.feature, refs: references(id) });
      if (!has && r.status === 'historical') R.historical.push({ type, id, feature: r.feature, note: r.note }); }
  }
  // conversation tables keyed by things that exist nowhere (neither in the game nor as remembered history)
  const exists = (type, id) => game[type].includes(id) || !!regOf[type + ':' + id];
  for (const id of inv.talk.kindWord) if (!exists('events', id)) R.dangling.push({ type: 'events', id, why: `cvKindWord has a label for '${id}', which the game never emits and the registry does not keep as history` });
  for (const id of [...new Set([...inv.talk.jobNoun, ...inv.talk.jobVerb, ...inv.talk.workTalk])]) if (!exists('jobs', id)) R.dangling.push({ type: 'jobs', id, why: `JOB_NOUN / JOB_VERB / CV_WORKTALK still describe '${id}', which is no longer a job` });
  // thin integration: chances to connect active content to village talk
  const accepted = Object.assign({}, ...Object.values(reg.features).map(f => f.accepted || {}));
  for (const id of game.events) { if (!regOf['events:' + id]) continue; const a = assessEvent(id, evs[id], inv); const miss = ['hear', 'opinion', 'talk'].filter(q => !a[q].ok && !(accepted[id] || '').startsWith(q)); if (miss.length) R.gaps.push({ type: 'events', id, miss: miss.map(q => `${q}: ${a[q].how}`) }); }
  for (const id of game.jobs) { const named = inv.names[id] || inv.talk.jobNoun.includes(id), work = inv.talk.workTalk.includes(id); if (!named || !work) R.gaps.push({ type: 'jobs', id, miss: [!named && 'no name for talk (LF2_JOBS name or JOB_NOUN)', !work && 'nothing to say about the work (CV_WORKTALK)'].filter(Boolean) }); }
  // features whose code changed since base
  if (base) { try { R.changedFiles = execSync(`git diff --name-only ${base}...HEAD`, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); } catch (e) { R.changedFiles = []; }
    for (const [fid, f] of Object.entries(reg.features)) { const hit = R.changedFiles.filter(cf => (f.code || []).some(c => cf === c || cf.startsWith(c))); if (hit.length) R.touched.push({ feature: fid, files: hit, integrations: f.integrations }); } }
  return R;
}

/* ---------------- report ---------------- */
export function report(R) {
  const L = [], q = a => Object.entries({ see: 'Can villagers see it?', hear: 'Can they hear about it?', remember: 'Can they remember it?', opinion: 'Can they form opinions about it?', gossip: 'Can they gossip about it?', talk: 'Can they discuss it with the player?' }).map(([k, t]) => `  - ${a[k].ok ? '✅' : '⬜'} ${t} ${a[k].how}`).join('\n');
  const n = R.added.length + R.removed.length + R.dangling.length;
  L.push('## Social integration check', '', n ? `**${n} thing${n > 1 ? 's' : ''} need${n > 1 ? '' : 's'} a decision** (added ${R.added.length}, removed ${R.removed.length}, dangling ${R.dangling.length}).` : '✅ The conversation and social simulation match the game: nothing unregistered, nothing removed without cleanup, nothing dangling.', '');
  L.push('### 1. What changed in the game');
  if (R.changedFiles.length) L.push(`Files changed: ${R.changedFiles.length}. Features touched: ${R.touched.map(t => '`' + t.feature + '`').join(', ') || 'none in the registry'}.`);
  for (const a of R.added) L.push(`- **Added** ${a.type.slice(0, -1)} \`${a.id}\`${a.where.length ? ' (' + a.where.join(', ') + ')' : ''}`);
  for (const r of R.removed) L.push(`- **Removed** ${r.type.slice(0, -1)} \`${r.id}\` (feature \`${r.feature}\`)`);
  if (!R.added.length && !R.removed.length) L.push('- Nothing added to or removed from the game since the registry was last updated.');
  L.push('', '### 2. Conversation integrations affected');
  for (const t of R.touched) L.push(`- \`${t.feature}\` (${t.files.join(', ')}): ${Object.entries(t.integrations || {}).map(([k, v]) => `${k}: ${v}`).join('; ')}`);
  if (!R.touched.length) L.push('- None.');
  L.push('', '### 3. New social opportunities');
  for (const a of R.added) { L.push(`- \`${a.id}\` (${a.type.slice(0, -1)})`); if (a.assess) { L.push(q(a.assess)); if (a.assess.unknownTags.length) L.push(`  - ⚠️ tags not in LF2_TAGS (they carry no meaning yet): ${a.assess.unknownTags.join(', ')}`); } else L.push(`  - needs: a name villagers use, something to say about it, who notices it, and whether it is a business people have opinions about`); }
  for (const g of R.gaps) L.push(`- thin integration, ${g.type.slice(0, -1)} \`${g.id}\`: ${g.miss.join('; ')}`);
  if (!R.added.length && !R.gaps.length) L.push('- None found.');
  L.push('', '### 4. Obsolete content and dependencies');
  for (const r of R.removed) { const by = {}; for (const x of r.refs) (by[x.layer] = by[x.layer] || []).push(x);
    L.push(`- \`${r.id}\` is gone from the game. Decide: **erase** (it never mattered) or **keep as history** (people remember it; set \`"status": "historical"\` in the registry, keep labels, remove what generates or offers it). Still referenced in:`);
    for (const [layer, xs] of Object.entries(by)) L.push(`  - ${layer}: ${xs.slice(0, 8).map(x => `\`${x.file}:${x.line}\``).join(', ')}${xs.length > 8 ? ` and ${xs.length - 8} more` : ''}`); if (!r.refs.length) L.push('  - nowhere: only the registry entry needs updating.'); }
  for (const d of R.dangling) L.push(`- dangling: ${d.why}`);
  if (!R.removed.length && !R.dangling.length) L.push('- None.');
  if (R.historical.length) L.push('', `Kept as history (remembered, no longer offered): ${R.historical.map(h => '`' + h.id + '`').join(', ')}.`);
  L.push('', '### 5. Changes implemented', '_Filled in by whoever acts on this report (the integration workflow or a developer)._', '', '### 6. Needs manual attention');
  const man = [...R.removed.map(r => `decide erase or history for \`${r.id}\``), ...R.added.filter(a => a.type !== 'events').map(a => `\`${a.id}\`: how should villagers talk about it?`)];
  L.push(man.length ? man.map(m => '- ' + m).join('\n') : '- Nothing.');
  return L.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reg = JSON.parse(fs.readFileSync(REG, 'utf8')), evs = staticEvents(), inv = await inventory(arg('file', path.join(root, 'dist', 'index.html')));
  const R = compare(reg, evs, inv, { base: arg('base') }), md = report(R);
  if (arg('md')) fs.writeFileSync(arg('md'), md); if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(R, null, 1));
  console.log(md); if (inv.errors.length) console.log('\npage errors: ' + inv.errors.slice(0, 3).join(' | '));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `needs_action=${R.added.length + R.removed.length + R.dangling.length > 0}\n`);
  if (arg('strict') && R.added.length + R.removed.length + R.dangling.length) process.exit(1);
}
