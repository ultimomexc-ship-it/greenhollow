// Dialogue lint: plays days of conversations (and listens to what villagers say to each other), then flags what reads wrong.
//   node tools/lintalk.mjs [days] [talksPerDay] [turns] [seed] [--file=build.html] [--json=out.json] [--show=rule]
// Rules (each with a count and examples):
//   self-third     a villager names themself ("Galba has been ...", said by Galba)
//   player-third   a villager talks about the player by name to the player ("Publius has told everyone")
//   repeat         the same sentence twice in one conversation
//   pivot          clunky topic changes ("…Also.", "Which — look, it connects —", ...)
//   infant         a baby offered as a topic or a person to get to know
//   full-name      first name + surname in speech (speech uses first names)
//   clock          clock times in speech ("16:30")
//   child-line     a child's line said by an adult ("Can I touch the well bucket?")
//   uncontracted   "do not", "it is", "I am" ... where people would say "don't", "it's", "I'm"
//   grammar        known broken shapes ("about Galla took", "and me argued", "Somebody and X")
//   self-news      somebody telling news about themself as gossip, or telling someone news about that person
//   overheard-rep  the same overheard exchange again and again
// Plus a sample of question -> answer pairs to read by eye.
import fs from 'node:fs';
import { playDays } from './longevity.mjs';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const sentences = s => s.replace(/\*[^*]+\*/g, ' ').split(/(?<=[.!?…])\s+(?=[A-Z"“'(*—])/).map(x => x.trim()).filter(x => x.length > 1);
export const PIVOTS = [/…Also\./, /Which — look, it connects —/, /Can I tell you something else\? —/, /Oh, that makes me think of —/, /Now that you mention it —/, /Speaking of which —/, /And another thing —/, /And now I think of it —/, /Oh, and —/];
export const CHILD_LINES = [/Can I touch the well bucket/, /Can I stay out a little longer/, /Is it nearly supper/, /Can I have the big bit/, /I am not small\. I am compact/, /I can skip a stone/, /I found a frog/];
const UNCONTRACTED = /\b(do not|does not|did not|is not|are not|was not|were not|will not|would not|cannot|could not|should not|have not|has not|had not|I am|it is|that is|there is|what is|you are|we are|they are|I will|I would|you will|let us|he is|she is|who is|where is|I have been|you have been)\b(?![.!?,]?\s*$)(?!\s*[.!?])/i;
const GRAMMAR = [[/\babout [A-Z][a-z]+ (took|lent|gave|had|was|found|stole|kept|paid)\b/, 'about + clause'], [/\b[A-Z][a-z]+ and me (had|argued|were|did)\b/, '"X and me" as subject'], [/^Somebody and [A-Z]/, '"Somebody and X"'], [/\bI is\b|\bI has\b|\bI owes\b/, 'I + third-person verb'], [/\b(a) [aeiou]\w+/i, null]];

export function lint({ rows, world }) {
  const P = world.people, byId = new Map(P.map(p => [p.id, p])), surnames = new Set(P.map(p => p.surname).filter(Boolean)), infants = P.filter(p => p.infant || p.age < 3).map(p => p.first);
  const hits = {}, add = (rule, text, ctx = '') => { (hits[rule] = hits[rule] || []).push(ctx ? ctx + ' | ' + text : text); };
  const word = n => new RegExp('\\b' + n + '\\b');
  let sentCount = 0;
  // conversations: group rows into conversations (turn 0 starts one)
  const convs = []; for (const r of rows) { if (r.say === undefined) continue; if (r.turn === 0) convs.push([]); if (convs.length) convs[convs.length - 1].push(r); }
  const qa = [];
  for (const c of convs) {
    const npc = byId.get(c[0].npc), me = byId.get(c[0].me), seen = new Set();
    for (const r of c) {
      const ss = sentences(r.say); sentCount += ss.length;
      for (const s of ss) { if (seen.has(s) && s.length > 12) add('repeat', s, npc && npc.first); seen.add(s); }
      if (npc && word(npc.first).test(r.say)) { for (const s of ss) if (word(npc.first).test(s) && !new RegExp('^' + npc.first + '[!?,.]').test(s)) { add('self-third', s, npc.first); break; } }
      if (me) for (const s of ss) { const m = s.match(word(me.first)); if (!m) continue; const i = m.index, before = s.slice(0, i), after = s.slice(i + me.first.length);
        const vocative = /^[!?.,—]/.test(after) && (/^\s*$/.test(before) || /(,|Oh|Ah|Hello|Hm\.?)\s*$/.test(before)); if (!vocative) { add('player-third', s, npc && npc.first); break; } }
      for (const re of PIVOTS) if (re.test(r.say)) { add('pivot', r.say.slice(0, 160), npc && npc.first); break; }
      for (const t of [r.say, ...(r.opts || [])]) { for (const b of infants) if (word(b).test(t) && /(spend more time with|really like|What is|know|getting on|watch .* around money)/.test(t)) { add('infant', t, b); break; } }
      for (const t of [r.say, ...(r.opts || [])]) { const m = t.match(/\b([A-Z][a-z]+) ([A-Z][a-z]+)\b/g); if (m) for (const x of m) if (surnames.has(x.split(' ')[1])) { add('full-name', t.slice(0, 140)); break; } }
      for (const t of [r.say, ...(r.opts || [])]) if (/\b\d{1,2}:\d\d\b/.test(t)) add('clock', t.slice(0, 140));
      if (npc && npc.age >= 16) for (const re of CHILD_LINES) if (re.test(r.say)) add('child-line', r.say.slice(0, 120), npc.first);
      for (const s of ss) if (UNCONTRACTED.test(s)) { add('uncontracted', s); }
      for (const t of [r.say, ...(r.opts || [])]) for (const [re, what] of GRAMMAR) if (what && re.test(t)) add('grammar', what + ': ' + t.slice(0, 140));
      if (r.picked && /\?$/.test(r.picked) && qa.length < 400) { const nx = c[c.indexOf(r) + 1]; if (nx) qa.push(`${npc ? npc.first : '?'} (${r.arch}): you "${r.picked}" -> "${nx.say.slice(0, 200)}"`); }
      for (const o of r.opts || []) { const m = o.match(/^Did you hear\? (.*)/); if (m && npc && word(npc.first).test(m[1])) add('self-news', 'told ' + npc.first + ' about themself: ' + o.slice(0, 120)); }
    }
  }
  // overheard
  const pairCount = new Map(); let heardLines = 0;
  for (const h of world.heard || []) {
    const key = h.lines.map(l => l.text).join(' / '); pairCount.set(key, (pairCount.get(key) || 0) + 1);
    for (const l of h.lines) { heardLines++; const sp = byId.get(l.id);
      if (sp && word(sp.first).test(l.text)) add('self-third', l.text, sp.first + ' (overheard)');
      for (const re of PIVOTS) if (re.test(l.text)) add('pivot', l.text, 'overheard');
      if (sp && sp.age >= 16) for (const re of CHILD_LINES) if (re.test(l.text)) add('child-line', l.text, sp.first + ' (overheard)');
      if (/\b\d{1,2}:\d\d\b/.test(l.text)) add('clock', l.text);
      { const m = l.text.match(/\b([A-Z][a-z]+) ([A-Z][a-z]+)\b/g); if (m) for (const x of m) if (surnames.has(x.split(' ')[1])) { add('full-name', l.text.slice(0, 140), 'overheard'); break; } }
      for (const s of sentences(l.text)) if (UNCONTRACTED.test(s)) add('uncontracted', s, 'overheard');
      for (const [re, what] of GRAMMAR) if (what && re.test(l.text)) add('grammar', what + ': ' + l.text.slice(0, 140));
      const m = l.text.match(/^(?:Have you heard|Did you hear)\? (.*)/); if (m) { for (const id of h.to) { const q = byId.get(id); if (q && word(q.first).test(m[1])) { add('self-news', l.text.slice(0, 120), 'overheard, ' + (q.id === l.id ? 'about the speaker' : 'about the listener')); break; } } }
    }
  }
  for (const [k, n] of pairCount) if (n >= 3) add('overheard-rep', `${n}x  ${k.slice(0, 140)}`);
  for (const s of world.shouts || []) { heardLines++; const sp = byId.get(s.id); if (sp && sp.age >= 16) for (const re of CHILD_LINES) if (re.test(s.text)) add('child-line', s.text, sp.first + ' (bubble)'); }
  const counts = Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, v.length]));
  return { counts, hits, qa, sentences: sentCount, conversations: convs.length, overheard: (world.heard || []).length, overheardLines: heardLines };
}

export function lintReport(L, show = null) {
  const out = [`# Dialogue lint`, '', `${L.conversations} conversations (${L.sentences} sentences), ${L.overheard} overheard exchanges.`, ''];
  const order = ['self-third', 'player-third', 'repeat', 'pivot', 'infant', 'full-name', 'clock', 'child-line', 'uncontracted', 'grammar', 'self-news', 'overheard-rep'];
  for (const k of order) { const v = L.hits[k] || []; out.push(`- ${k}: ${v.length}${k === 'uncontracted' ? ` (${(100 * v.length / Math.max(1, L.sentences)).toFixed(1)} per 100 sentences)` : ''}`); for (const x of [...new Set(v)].slice(0, show === k ? 40 : 3)) out.push('    ' + x); }
  out.push('', '## Questions and answers (a sample to read)', ...L.qa.slice(0, show === 'qa' ? 120 : 25).map(x => '- ' + x));
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [days = 6, per = 8, turns = 8, seed = 'lint'] = process.argv.slice(2).filter(x => !x.startsWith('--'));
  const r = await playDays({ days: +days, talksPerDay: +per, turns: +turns, seed, file: arg('file', null), collect: true }), L = lint(r);
  if (arg('json', null)) fs.writeFileSync(arg('json', null), JSON.stringify(L, null, 1));
  console.log(lintReport(L, arg('show', null))); if (r.errors.length) console.log('\npage errors: ' + r.errors.slice(0, 3).join(' | '));
}
