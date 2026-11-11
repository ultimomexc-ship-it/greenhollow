/* Playtest: a bot plays the villager you steer (talks to people, makes mischief on a schedule) while the game runs for days of game time,
   and writes a transcript plus a report (what was said, who knew what, what was blamed on whom) with automatic checks for text slips, staleness and acts that never fire.
   Same seed = same run. Use it to read the game without playing it.

     node tools/playtest.mjs <scenario> [--days=5] [--seed=41] [--out=/tmp/playtest] [--file=dist/index.html]
   scenarios: village (a quiet week on the farming island), meddle (the bot does a series of deeds and answers for them), social (the bot talks to everybody, every day),
              romance (everything on, the plain village, nobody steered but watched) */
import path from 'node:path';
import fs from 'node:fs';
import { launch, openGame, simulate } from '../tests/lib.mjs';

const args = process.argv.slice(2), scenario = args.find(a => !a.startsWith('--')) || 'village';
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const days = +opt('days', scenario === 'meddle' ? 6 : 5), seed = +opt('seed', 41), out = opt('out', '/tmp/claude-0/playtest'), file = opt('file', 'dist/index.html');
fs.mkdirSync(out, { recursive: true });

const browser = await launch();
const { page, errors } = await openGame(browser, path.resolve(file), { rng: seed, town: 'playtest-' + seed });

/* ---- the bot and the recorder, inside the page ---- */
await page.evaluate(([scenario]) => {
  const world = scenario === 'romance' ? 'village' : 'farm';
  newTown('playtest', world); if (scenario === 'romance' || scenario === 'meddle' || scenario === 'social') MODS.all();
  TALK.words = true; window.__T = []; window.__B = [];
  const orig = talkFinish;
  talkFinish = function (c, a, b, listened) { const n0 = TALK.log.length; orig(c, a, b, listened); const e = TALK.log[TALK.log.length - 1]; if (e && TALK.log.length >= n0) window.__T.push({ t: game.time, a: a.first, b: b.first, place: (typeof placeOf === 'function' ? placeOf(a) : ''), acts: e.acts.map(x => x.act), subj: e.acts.map(x => x.x && x.x.about), lines: e.lines || [], kind: e.player ? 'player' : 'npc' }); };
  startPlaying(npcs.filter(n => !n.dead && n.age >= 18 && !n.infant)[0]);
  if (scenario === 'romance') {   // three couples in the making: one-sided, mutual, and one already walking out a while
    const singles = npcs.filter(n => !n.dead && !n.player && n.age >= 17 && n.age < 45); const ms = singles.filter(n => !n.female), fs = singles.filter(n => n.female), pairs = [];
    for (const m of ms) { const f = fs.find(x => !pairs.some(p => p[1] === x) && romOK(m, x)); if (f) pairs.push([m, f]); if (pairs.length === 3) break; }
    window.__pairs = pairs.map(([m, f]) => [m.first, f.first]);
    pairs.forEach(([m, f], i) => { for (const n of [m, f]) { const sp = n.fam.spouse != null ? byId(n.fam.spouse) : null; if (sp) sp.fam.spouse = null; n.fam.spouse = null; n.fam.partner = null; n.grief = 0; } m.aff[f.id] = f.aff[m.id] = 36 + i * 6; m.know[f.id] = f.know[m.id] = 34; if (i === 0) m.crush = f.id; if (i === 1) { m.crush = f.id; f.crush = m.id; } if (i === 2) { startCourtship(m, f); m.courtSince = f.courtSince = game.time - 9 * 1440; m.aff[f.id] = f.aff[m.id] = 66; } });
  }
  window.BOT = {
    persona: 'default',
    near(k) { const P = game.player; return npcs.filter(n => !n.dead && !n.player && !n.infant && n.age >= 8 && n.pose !== 'sleep' && !n.inShip && lvlOf(n.ty) === lvlOf(P.ty)).sort((a, b) => lfDist(P, a) - lfDist(P, b)).slice(0, k); },
    /** walk the bot up to somebody (a straight cut), then talk for a few exchanges choosing answers by persona */
    talk(o, steps = 6) {
      const P = game.player; const free = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: o.tx + dx, y: o.ty + dy })).find(s => walkable(s.x, s.y) && !tileOwner.get(tkey(s.x, s.y)));
      if (free) { P.tx = P.x = free.x; P.ty = P.y = free.y; P.moving = false; P.path = []; rebuildOcc(); }
      o.talkUntil = 0; const rec = { t: game.time, with: o.first, rel: '', exch: [] };
      openTalk(o); let say = talkUI.say, opts = (talkUI.opts || []).map(x => [x[0], x[1]]); rec.open = say; const seeMenu = () => { for (const q of (PT.s && PT.s.opts) || []) (window.__M = window.__M || []).push(q.id + ' :: ' + q.label); }; seeMenu();
      for (let i = 0; i < steps && opts.length; i++) {
        const pick = BOT.choose(opts, say); if (!pick) break; const qid = PT.s && PT.s.opts && PT.s.opts[+String(pick[0]).slice(1)] ? PT.s.opts[+String(pick[0]).slice(1)].id : pick[0]; const st = ptStep(pick[0]); rec.exch.push({ me: (st.you ? '[' + pick[1] + '] ' + st.you : pick[1]), they: st.say || '', id: qid });
        if (st.close) break; say = st.say; opts = (st.opts || []).map(x => [x[0], x[1]]); seeMenu(); if (pick[0] === 'bye') break;
      }
      try { closeTalk(); } catch (e) {} window.__B.push(rec); return rec;
    },
    choose(opts, say) {
      const rx = {
        repentant: [/sorry|Give a gift|Apolog/i, /Thank|Forgive|Accept|Promise/i], liar: [/Deny|Blame/i, /Shrug|Defend/i], brazen: [/Defend|Shrug|Stand by/i],
        helpful: [/Give it|Promise|Give a gift/i, /Comfort|Sympath/i], default: []
      }[BOT.persona] || [];
      const real = opts.filter(o => o[0] !== 'bye'); if (!real.length) return opts[0];
      for (const r of rx) { const m = real.find(o => r.test(o[1])); if (m) return m; }
      return real[Math.floor(Math.random() * real.length)];
    },
    chat(k, steps) { return BOT.near(k).map(o => BOT.talk(o, steps)); },
    /** knock the wall of an occupied home out (the real demolition), with the resident put on the privy if asked */
    wall(opts = {}) {
      const P = game.player; const R = rooms.filter(q => !q.free && !q.dead && q.kind === 'house' && meddleResidents(q).some(n => !n.player && n.pose !== 'sleep'))[0] || rooms.find(q => !q.free && !q.dead && q.kind === 'house' && meddleResidents(q).some(n => !n.player));
      if (!R) return null; const res = meddleResidents(R).find(n => !n.player); res.pose = 'stand'; res.moving = false; res.tx = res.x = R.x + 1; res.ty = res.y = R.y + 1;
      if (opts.privy) { res.plan = [{ k: 'wait', priv: true, text: 'Using the privy' }]; res.si = 0; }
      P.tx = P.x = R.x + R.w; P.ty = P.y = R.y + 1; P.moving = false; rebuildOcc();
      if (opts.unseen) { for (const n of npcs) if (!n.player && n !== res && lfDist(n, res) < 14) { n.tx = n.x = Math.max(3, R.x - 20); n.ty = n.y = Math.max(3, R.y + 2); } res.pose = 'sleep'; P.tx = P.x = R.x + R.w + 9; }
      const r = { kind: opts.privy ? 'privy' : opts.unseen ? 'unseen' : 'house', home: R.name || 'a house', who: res.first, t: game.time };
      if (opts.unseen) meddleNote('wall_removed', R.x + R.w - 1, R.y + 1, P, { room: rooms.indexOf(R), residents: meddleResidents(R) }); else bldDemolish(R, R.x + R.w - 1, R.y + 1, P);
      window.__B.push({ t: game.time, deed: r }); return r;
    },
    bed() { const P = game.player; const R = rooms.find(q => !q.free && !q.dead && q.kind === 'house' && (q.beds || []).length && meddleResidents(q).some(n => !n.player)); if (!R) return null; const b = R.beds[0]; P.tx = P.x = b.x; P.ty = P.y = b.y + 1; rebuildOcc(); bldDeleteFurniture(b.x, b.y, P); window.__B.push({ t: game.time, deed: { kind: 'bed' } }); return true; },
    push() { const P = game.player, o = BOT.near(1)[0]; if (!o) return null; meddleNote('person_pushed', o.tx, o.ty, P, { room: -1, residents: [o] }); window.__B.push({ t: game.time, deed: { kind: 'push', who: o.first } }); return o.first; }
  };
}, [scenario]);

/* ---- the schedule ---- */
const day = 1440, log = s => console.log(s);
const step = (m) => simulate(page, m);
const nobot = opt('nobot', '0') === '1'; const bot = (fn, ...a) => (nobot && fn === 'chat') ? null : page.evaluate(([fn, a]) => BOT[fn](...a), [fn, a]);
const persona = p => page.evaluate(p => { BOT.persona = p; }, p);
const dailySnapshots = [];
async function snapshot(d) { dailySnapshots.push(await page.evaluate(d => ({ day: d, t: game.time, rep: repVillage(game.player), chron: (town.chron || []).slice(-6).map(c => c.text), journal: jrHTML().replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ').slice(0, 900), counts: Object.fromEntries(Object.entries(lf2Ev().reduce((m, e) => (m[e.kind] = (m[e.kind] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 14)) }), d)); }

await step(6 * 60);   // from midnight to six
for (let d = 0; d < days; d++) {
  const base = await page.evaluate(() => Math.floor(game.time / 1440) * 1440);
  const until = async h => { const now = await page.evaluate(() => game.time); const target = base + h * 60; if (target > now) await step(target - now); };
  if (scenario === 'meddle') {
    await until(9); await bot('chat', 2, 4);
    if (d === 0) { await until(10); log('day ' + d + ': wall on an awake resident'); await bot('wall', {}); await step(20); }
    if (d === 1) { await until(10); log('day ' + d + ': wall on somebody on the privy'); await bot('wall', { privy: true }); await step(20); await persona('liar'); }
    if (d === 2) { await until(10); log('day ' + d + ': a wall nobody sees'); await bot('wall', { unseen: true }); await bot('bed'); await bot('push'); await step(30); }
    if (d === 3) { await persona('repentant'); }
    if (d === 4) { await persona('brazen'); }
    for (const h of [12, 15, 18, 20]) { await until(h); await bot('chat', 3, 6); }
  } else if (scenario === 'social') {
    for (const h of [8, 10, 12, 14, 16, 18, 20]) { await until(h); await bot('chat', 3, 7); }
  } else {
    for (const h of [9, 13, 18]) { await until(h); await bot('chat', 2, 4); }
  }
  await until(23); await snapshot(d);
  await step(((base + 1440 + 6 * 60) - (await page.evaluate(() => game.time))));   // (on to the next morning, six o'clock)
}
await step(60);

/* ---- collect ---- */
const data = await page.evaluate(() => {
  const P = game.player, T = window.__T, B = window.__B;
  const people = npcs.filter(n => !n.dead && !n.infant && !n.player).map(n => ({ name: n.first, age: n.age, job: n.job || '', mood: n.mood == null ? null : Math.round(n.mood), view: (typeof repWord === 'function' ? repWord(n, P) : '') || '', aff: Math.round(n.aff[P.id] || 0), knows: (n.tmem || []).filter(m => m.ev != null && m.kind !== 'did').length, secrets: (n.tmem || []).filter(m => m.secret).length, reqs: (n.reqs || []).filter(r => r.state !== 'done' && r.state !== 'failed').length, refl: Object.keys(n.refl || {}).length }));
  const acts = {}; for (const t of T) for (const a of t.acts) acts[a] = (acts[a] || 0) + 1;
  const all = Object.keys(ACTS), blamed = [], deeds = lf2Ev().filter(e => e.actor === P.id && ['wall_removed', 'home_destroyed', 'building_down', 'bed_moved', 'furniture_removed', 'person_pushed', 'caught_on_privy'].includes(e.kind));
  for (const e of deeds) { const who = {}; for (const o of npcs) { const m = (o.tmem || []).find(q => q.ev === e.id && q.kind !== 'did'); if (m && m.ver && m.ver.who != null) who[m.ver.who === P.id ? 'you' : (byId(m.ver.who) || {}).first] = (who[m.ver.who === P.id ? 'you' : (byId(m.ver.who) || {}).first] || 0) + 1; } blamed.push({ ev: e.kind, anon: !!e.anon, blamed: who, knew: npcs.filter(o => (o.tmem || []).some(q => q.ev === e.id)).length }); }
  return { T, B, people, acts, unused: all.filter(a => !acts[a] && !ACTS[a].reply === false || (!acts[a])).filter(a => !['cry_deed', 'mutter', 'call_child', 'gift_from_nobody', 'gift_anon_reply'].includes(a)), blamed, rep: repVillage(P), miss: (typeof LX_MISS !== 'undefined' ? LX_MISS : {}), pairs: window.__pairs || [], menu: window.__M || [], pack: town.pack, logLen: TALK.log.length, chron: (town.chron || []).slice(-30).map(c => c.text), player: P.first };
});
await browser.close();

/* ---- lint ---- */
const lines = []; for (const t of data.T) for (const l of t.lines) lines.push({ t, text: l.replace(/^[^:]+: /, ''), who: l.split(':')[0] });
const bots = []; for (const b of data.B) if (b.exch) for (const e of b.exch) { bots.push({ text: e.me, who: data.player, bot: true, act: e.id }); if (e.they) for (const s of String(e.they).split('\n').filter(Boolean)) bots.push({ text: s, who: b.with, bot: true }); }
const rules = [
  ['placeholder', /[{}]|undefined|NaN|\[object|null/],
  ['stray punctuation', /\s[,.!?;:]|[,;:][.,;:]|\.\.(?!\.)/],
  ['lowercase sentence start', /(?:^|[.!?]\s+)[a-z]/],
  ['a/an', /\ba [aeiouAEIOU]\w|\ban [bcdfgjklmnpqrstvwxzBCDFGJKLMNPQRSTVWXZ]\w/],
  ['a + plural', /\b(?:a|an) \w+[^s\W]s\b(?! of)/],
  ['doubled word', /\b(\w{3,}) \1\b/i],
  ['very long', /^.{230,}$/],
  ['exclamation in island voice', data.pack === 'island' ? /!/ : /(?!x)x/],
  ['connective doubled', /\b(?:Oh, and|And) and\b|\b(\w+), \1\b/],
  ['hedge with a stray comma', /\b(I suppose|I think|Probably|Perhaps|Maybe), (?:the|a|it|I|we|you|there)\b/],
  ['empty', /^\s*$/]
];
const menuLines = [...new Set(data.menu)].map(m => ({ text: m.split(' :: ').slice(1).join(' :: '), act: m.split(' :: ')[0], menu: true }));
const issues = {}; for (const r of [...lines, ...bots, ...menuLines]) for (const [name, rx] of rules) if (rx.test(r.text)) (issues[name] = issues[name] || []).push(name === 'empty' ? 'acts: ' + (r.t ? r.t.acts.join(',') : r.menu ? 'menu ' + r.act : 'bot ' + (r.act || '')) : (r.menu ? '[menu ' + r.act + '] ' : '') + r.text);
// the listener named in the third person ("I heard what Agrippina thinks" said to Agrippina)
const persp = []; for (const t of data.T) for (const l of t.lines) { const who = l.split(':')[0], text = l.replace(/^[^:]+: /, ''), other = who === t.a ? t.b : t.a; if (other && other !== who && new RegExp('(?:thinks of|heard what|fond of|soft spot for|about|like|what) ' + other + '\\b').test(text)) persp.push(`${who} to ${other}: ${text}`); }
if (persp.length) issues['listener named in the third person'] = persp;
const PURPOSE = /^(raise_deed|ask_favour|chase_favour|confront_jealous|declare|ask_to_walk|propose|flirt|confide|story_preface|share_news|warn|apologise|send_gift|offer_gift|callback|report_day|ask_day|ask_news|ask_price|tell_price|keeper_call|shop_greet)$/;
const talkConvs = data.T.filter(t => t.kind === 'npc' && t.acts.includes('farewell')); const purposeful = talkConvs.filter(t => t.acts.some(a => PURPOSE.test(a))).length;
const lens = talkConvs.map(t => t.lines.length).sort((a, b) => a - b), medLen = lens[Math.floor(lens.length / 2)] || 0;
const qa = []; for (const t of data.T) for (let i = 0; i + 1 < t.acts.length; i++) { const pair = { ask_opinion: 'give_opinion', ask_family: 'answer_family', ask_where: 'tell_where' }[t.acts[i]]; if (pair && t.acts[i + 1] === pair && t.subj && t.subj[i] && t.subj[i + 1] && t.subj[i] !== t.subj[i + 1]) qa.push(t.lines[i] + ' / ' + t.lines[i + 1]); }
if (qa.length) issues['answer about somebody else'] = qa;
const freq = {}; for (const l of lines) freq[l.text] = (freq[l.text] || 0) + 1; const stale = Object.entries(freq).filter(([, n]) => n >= 6).sort((a, b) => b[1] - a[1]).slice(0, 12);
const uniq = new Set(lines.map(l => l.text)).size;
let runs = 0; const runEx = []; for (const t of data.T) { let prev = '', n = 0; for (const l of t.lines) { const w = l.split(':')[0]; if (w === prev) { n++; if (n === 2) { runs++; if (runEx.length < 3) runEx.push(t.lines.slice(0, 6).join(' / ')); } } else { prev = w; n = 0; } } }
const empties = data.T.filter(t => t.kind === 'npc' && t.acts.filter(a => !/greet|farewell|pre_close/.test(a)).length === 0).length;
const ritual = lines.filter(l => /^(Hello|Morning|Evening|See you|Take care|Good)/i.test(l.text)).length;

/* ---- scenario expectations ---- */
let md_pairs = []; const expect = [];
const has = a => (data.acts[a] || 0) > 0;
const ok = (name, cond, detail = '') => expect.push({ name, pass: !!cond, detail });
ok('conversations happen (>=20/day)', data.T.length >= 20 * days, data.T.length + ' in ' + days + ' days');
ok('no engine errors', errors.length === 0, errors.slice(0, 2).join(' | '));
ok('no text slips', Object.keys(issues).length === 0, Object.entries(issues).map(([k, v]) => k + ' x' + v.length).join(', '));
ok('every act supplies what its lines need', Object.keys(data.miss).length === 0, Object.entries(data.miss).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + ' x' + v).join(', '));
ok('variety (unique lines >= 30%)', uniq / Math.max(1, lines.length) >= 0.3, (uniq / Math.max(1, lines.length)).toFixed(2));
if (scenario === 'meddle') {
  ok('people cried out', has('cry_deed')); ok('somebody raised a deed with the bot', has('raise_deed') || data.B.some(b => /You .*(wall|house|privy|bed)/i.test(b.open || '')), 'raise_deed ' + (data.acts.raise_deed || 0));
  ok('news about the deeds travelled', data.blamed.some(b => b.knew >= 4), JSON.stringify(data.blamed.map(b => [b.ev, b.knew])));
  ok('an unseen deed was blamed on somebody', data.blamed.some(b => b.anon && Object.keys(b.blamed).some(k => k !== 'you')), JSON.stringify(data.blamed.filter(b => b.anon)));
  ok('a reputation formed', Object.keys(data.rep).length > 0, JSON.stringify(data.rep));
}
if (scenario === 'romance') ok('romance acts fired', ['flirt', 'declare', 'ask_to_walk', 'propose'].some(has), JSON.stringify(['flirt', 'declare', 'ask_to_walk', 'propose'].map(a => [a, data.acts[a] || 0])));
if (scenario === 'social') { const mute = data.B.flatMap(b => (b.exch || []).filter(e => e.id !== 'bye' && !/Goodbye|^Leave|Say nothing/.test(e.me) && !e.they).map(e => e.id + ': ' + e.me)); ok('the bot got answers every time', mute.length === 0, mute.slice(0, 4).join(' | ')); ok('people told the bot things (news/opinion/day)', ['share_news', 'give_opinion', 'report_day', 'answer_family'].some(has)); }

/* ---- write ---- */
const fmt = t => { const m = Math.floor(t % 1440), d = Math.floor(t / 1440); return `d${d} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const md = [];
md.push(`# Playtest: ${scenario} (${days} days, seed ${seed}, voice ${data.pack})`, '', `Bot villager: **${data.player}**`, '', ...(data.pairs && data.pairs.length ? ['Couples in the making: ' + data.pairs.map(p => p.join(' & ')).join('; '), ''] : []));
md.push('## Verdict', '', ...expect.map(e => `- ${e.pass ? 'PASS' : 'WARN'}  ${e.name}${e.detail ? '  (' + e.detail + ')' : ''}`), '');
md.push('## Numbers', '', `- conversations and barks: ${data.T.length}; spoken lines: ${lines.length}; unique: ${uniq} (${(100 * uniq / Math.max(1, lines.length)).toFixed(0)}%)`, `- conversations with nothing but greeting and goodbye: ${empties}`, `- runs of three lines by one speaker: ${runs}${runEx.length ? ' e.g. ' + runEx[0] : ''}`);
md.push(`- conversations with a real purpose (news, a grudge, a favour, the day, romance): ${purposeful} of ${talkConvs.length} (${(100 * purposeful / Math.max(1, talkConvs.length)).toFixed(0)}%); median length ${medLen} lines, shortest ${lens[0] || 0}, longest ${lens[lens.length - 1] || 0}`);
{ const asked = data.acts.ask_news || 0, none = data.acts.no_news || 0, ops = lines.filter(l => /fond of|soft spot|one of the good ones|all right|nothing against|careful around|cannot stand|do not trust/i.test(l.text)), thin = ops.filter(l => /talked a few times|heard what|heard that/i.test(l.text)).length; md.push(`- "any news?" had an answer ${asked - none} of ${asked} times; opinions with a thin reason ("we have talked", "I heard what X thinks"): ${thin} of ${ops.length}`); }
md.push(`- acts used: ${Object.keys(data.acts).length} of ${Object.keys(data.acts).length + data.unused.length}`, `- most used: ${Object.entries(data.acts).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + ' ' + v).join(', ')}`, `- never used: ${data.unused.join(', ')}`, '');
if (stale.length) md.push('## Said too often', '', ...stale.map(([t, n]) => `- x${n}: ${t}`), '');
if (Object.keys(issues).length) md.push('## Text slips', '', ...Object.entries(issues).map(([k, v]) => `- **${k}** (${v.length}): ${[...new Set(v)].slice(0, 4).map(s => '"' + s.slice(0, 120) + '"').join('; ')}`), '');
md.push('## What the village thinks of the bot', '', `Village word: ${JSON.stringify(data.rep)}`, '', '| who | job | mood | thinks you | fondness | knows | secrets | open asks |', '|---|---|---|---|---|---|---|---|', ...data.people.map(p => `| ${p.name} | ${p.job} | ${p.mood} | ${p.view} | ${p.aff} | ${p.knows} | ${p.secrets} | ${p.reqs} |`), '');
if (data.blamed.length) md.push('## The bot\'s deeds: who knew, who was blamed', '', ...data.blamed.map(b => `- ${b.ev}${b.anon ? ' (unseen)' : ''}: ${b.knew} know it; believed doer: ${JSON.stringify(b.blamed)}`), '');
md.push('## Days', '');
for (const s of dailySnapshots) md.push(`### Day ${s.day + 1}`, '', `Events so far: ${JSON.stringify(s.counts)}`, '', `Chronicle: ${s.chron.join(' / ')}`, '', `Journal: ${s.journal}`, '');
md.push('## The bot\'s own talks', '');
for (const b of data.B) { if (b.deed) { md.push(`**${fmt(b.t)}  DEED** ${JSON.stringify(b.deed)}`, ''); continue; } md.push(`**${fmt(b.t)}  with ${b.with}**`, '', `> ${String(b.open).replace(/\n/g, ' / ')}`); for (const e of b.exch) md.push(`> **${data.player}:** ${e.me}`, `> ${String(e.they).replace(/\n/g, ' / ')}`); md.push(''); }
md.push('## Everything the villagers said', '');
let last = -1; for (const t of data.T) { const d = Math.floor(t.t / 1440); if (d !== last) { md.push(`### Day ${d + 1}`, ''); last = d; } md.push(`**${fmt(t.t)}  ${t.a} & ${t.b}** ${t.place ? '(' + t.place + ')' : ''}`, ...t.lines.map(l => '- ' + l), ''); }
fs.writeFileSync(path.join(out, scenario + '.md'), md.join('\n')); fs.writeFileSync(path.join(out, scenario + '.json'), JSON.stringify({ expect, issues: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, v.length])), acts: data.acts, unused: data.unused, blamed: data.blamed, rep: data.rep }, null, 1));
console.log(`${scenario}: [log ${data.logLen}] ${data.T.length} conversations, ${lines.length} lines (${(100 * uniq / Math.max(1, lines.length)).toFixed(0)}% unique), acts ${Object.keys(data.acts).length}`);
for (const e of expect) console.log((e.pass ? 'PASS ' : 'WARN ') + e.name + (e.detail ? '  (' + e.detail + ')' : ''));
console.log('report: ' + path.join(out, scenario + '.md'));
