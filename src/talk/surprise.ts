/* Surprises (life2/surprise.ts): somebody moved across the island, carried out of the house asleep, or given (or robbed of) a bed, a roof, a window,
   a fence or fields while time stood still in build mode. Nobody saw it and nobody knows who did it, so it is the most startling thing they know,
   and they come out with it first, to whoever they talk to next (`blurt`: first in `ptBegin` and first in `talkAgenda`), one thing at a time, each thing
   once per listener. The listener answers (`odd_wonder`, `odd_glad`, `odd_sorry`, `odd_explain`) and keeps it as news to pass on. `odd_cry` is the line
   said aloud, to nobody, the moment they notice. Lines: talk/words/plain-life.ts and island-life.ts, tagged by `how` (the surprise) and `op` (good, bad, odd). */

ACTS.blurt = {
  kind: 'life',
  stage: 'topic',
  when: (c: any, sp: any, li: any) => {
    if (sp.player || sp.pose === 'sleep' || (c.done.blurt || 0) >= 3 || typeof surpUntold !== 'function') return false;
    const s = surpUntold(sp, li);
    if (!s) return false;
    // (each surprise is its own subject, so one told does not keep the next from being told)
    c.lifeItem = 'surprise:' + s.k + ':' + s.t;
    return true;
  },
  w: () => 30,
  apply: (c: any, sp: any, li: any) => {
    const s = surpUntold(sp, li);
    c.done.blurt = (c.done.blurt || 0) + 1;
    if (!s) return;
    s.told[li.id] = game.time;
    c.newsHow = s.k;
    c.surpK = s.k;
    c.op = surpTone(s.k);
    c.lifeQty = s.q;
    // the listener knows it now, from the one it happened to, and can pass it on
    const ev = s.ev != null ? lf2EvById(s.ev) : null;
    if (ev && !TM.ofEv(li, ev.id)) TM.addEv(li, ev, 'told', 0.95, sp, 1, { who: null, sev: ev.sev });
  },
  replies: ['odd_glad', 'odd_sorry', 'odd_wonder', 'odd_explain']
};
ACTS.odd_cry = { kind: 'life', stage: 'topic', when: () => false, apply: () => {}, replies: [] };
const oddReply = (id: string, tone: string[], w: number, fx?: (c: any, sp: any, li: any) => void) => {
  ACTS[id] = {
    kind: 'life',
    stage: 'topic',
    reply: true,
    when: (c: any) => !!c.surpK && tone.includes(c.op),
    w: () => w,
    apply: (c: any, sp: any, li: any) => {
      if (fx) fx(c, sp, li);
    },
    replies: []
  };
};
oddReply('odd_glad', ['good'], 3, (c, sp, li) => lfAff(li, sp, 1, 'was glad for me'));
oddReply('odd_sorry', ['bad'], 3, (c, sp, li) => lfAff(li, sp, 1, 'felt for me'));
oddReply('odd_wonder', ['good', 'bad', 'odd'], 1.5);
oddReply('odd_explain', ['odd', 'good'], 1);
