/* Conversation depth (docs/talk-engine.md, 6.2, 6.3, 6.5, 5.4): topics that link or start afresh ("Speaking of which" / "Anyway"), stories with a preface and an invitation, callbacks to what was said last time, and daily reflection (patterns become opinions). The small acts of an ordinary talk are in the depth-*.ts files that follow; the same for everybody. */

/* ---- topic links ---- */
const talkSubject = (c: any): string | null => c.aboutName || c.lifeItem || null;
const LX_LINKS: any = {
  plain: { linked: ['Speaking of which, ', 'On that note, ', 'And while we are on it, '], fresh: ['Anyway. ', 'Oh, and ', 'Changing the subject: '] },
  island: {
    linked: ['Related to that, ', 'On that subject, ', 'Staying with it for a moment, '],
    fresh: ['Anyway. ', 'Unrelated, but ', 'On a different note, ']
  }
};
function lxLink(text: string, link: string): string {
  const pk = (typeof town !== 'undefined' && town && town.pack) || 'plain',
    L = (LX_LINKS[pk] || LX_LINKS.plain)[link];
  if (!L || !text) return text;
  if (/^(And|Oh|Anyway|Well|So|Now|But|You|Between us|Mind you|Listen|Here)\b/.test(text)) return text; // (it has a connective of its own)
  const pre = L[Math.floor(Math.random() * L.length)],
    w0 = text.split(/[ ,.!?]/)[0];
  const keep = /[.:] $/.test(pre) || w0 === 'I' || /^I'/.test(text) || npcs.some((n: any) => n.first === w0);
  const joined = pre + (keep ? text : text.charAt(0).toLowerCase() + text.slice(1));
  return joined.split(/\s+/).length > 22 ? text : joined; // (a line that would run past twenty-two words is said without its linking phrase)
}
/** called by talkTurn after a topic act: is this about the same thing as the last topic, or a fresh start? */
function talkLinkOf(c: any): string {
  const subj = talkSubject(c),
    prev = c.lastSubj;
  c.nTopics = (c.nTopics || 0) + 1;
  if (subj) c.lastSubj = subj;
  if (c.nTopics < 2) return '';
  if (subj && prev && subj === prev) return Math.random() < 0.7 ? 'linked' : '';
  return Math.random() < 0.4 ? 'fresh' : '';
}

/* ---- stories: preface, invitation, body, reaction ---- */
ACTS.story_preface = {
  kind: 'world',
  stage: 'topic',
  preview: () => ({}),
  w: () => 1.6,
  when: (c: any, sp: any, li: any) => {
    if (c.done.story_preface || (c.done.share_news || 0) >= 2) return false;
    const pk = TE.pick(sp, li, c);
    if (!pk || pk.m.imp < 0.55) return false;
    c.storyNews = pk;
    return true;
  },
  apply: (c: any) => {
    c.done.story_preface = 1;
  },
  replies: ['story_invite']
};
ACTS.story_invite = {
  kind: 'world',
  stage: 'topic',
  reply: true,
  when: (c: any) => !!c.storyNews,
  w: () => 1,
  apply: () => {},
  replies: ['share_news']
};

/* ---- callbacks: what we said last time ---- */
const lastTalkMem = (sp: any, li: any) => {
  const mem = sp.tmem || [];
  for (let i = mem.length - 1; i >= 0; i--) if (mem[i].kind === 'talked' && mem[i].with === li.id) return mem[i];
  return null;
};
ACTS.callback = {
  kind: 'small',
  stage: 'topic',
  preview: (c: any, sp: any, li: any) => {
    const m = lastTalkMem(sp, li);
    return { about: m ? m.subj : '' };
  },
  w: () => 0.7,
  when: (c: any, sp: any, li: any) => {
    if (c.done.callback) return false;
    const m = lastTalkMem(sp, li);
    return (
      !!m &&
      !!m.subj &&
      npcs.some((o: any) => o.first === m.subj) &&
      m.subj !== sp.first && // (somebody who was the subject of the last talk is not reminded of themselves, nor told of it)
      m.subj !== li.first &&
      !m.called &&
      game.time - m.t > 240 &&
      game.time - m.t < 2880 &&
      Math.random() < 0.35
    );
  }, // (only about a person, and not every time)
  apply: (c: any, sp: any, li: any) => {
    const m = lastTalkMem(sp, li);
    m.called = true;
    c.done.callback = 1;
    c.aboutName = m.subj;
  },
  replies: ['callback_answer']
};
ACTS.callback_answer = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };

/* ---- reflection: patterns become opinions ---- */
function reflect(n: any) {
  if (n.dead || n.infant || !n.why) return;
  const R = n.refl || (n.refl = {});
  for (const id of Object.keys(n.why)) {
    const L = n.why[id];
    if (L.length < 2) continue;
    let pos = 0,
      neg = 0;
    for (const e of L) {
      if (PEOPLE_GENERIC.includes(e.why)) continue;
      if (e.v > 0) pos += e.v;
      else neg += e.v;
    }
    const o = byId(+id);
    if (!o || o.dead) continue;
    const w = neg < -8 && neg < -pos ? 'unkind' : pos > 8 && pos > -neg ? 'good' : '';
    if (w && (!R[id] || R[id].w !== w)) {
      R[id] = { w, t: game.time };
      TM.add(n, { kind: 'inferred', about: o.id, trait: w, conf: 0.8, imp: 0.5 });
    }
  }
}
LF2.hourly.push((h: number) => {
  if (h === 3) for (const n of npcs) reflect(n);
});
