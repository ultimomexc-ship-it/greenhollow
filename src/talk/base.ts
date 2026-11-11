/* Talk, from scratch (design: docs/talk-engine.md). The old chat engines (dialogue/*, social2/*) are gone; this file holds the few plain helpers
   the rest of the game still needs and quiet stand-ins for the calls that used to speak, until the new engine (acts, lexicon, registry) takes over.
   Nobody talks in the meantime: `say` and the other speech producers do nothing, and `drainEvents` drops whatever is still pushed. */

const TALK: any = { engine: 'new', on: { ritual: true, small: true, world: true, life: true, trade: true, person: true, feeling: true, economy: true, gift: true, romance: true, family: true, law: true } };   // on[kind]: switch a whole kind of talk off for testing

/* ---- plain helpers (they lived in the old dialogue files) ---- */
const anyOf = (a: any[]) => a[Math.floor(Math.random() * a.length)];
const dayN = () => Math.floor(game.time / 1440);
const personById = (id: any) => byId(id) || (town.dead || []).find((r: any) => r.id === id) || null;
const cvPron = (o: any) => o.female ? { he: 'she', him: 'her', his: 'her', He: 'She' } : { he: 'he', him: 'him', his: 'his', He: 'He' };
const cvCap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
function placeWords(s: string): string {   // (until the registry: on a blank island the old village's words become what exists)
  if (!s || typeof s !== 'string' || typeof town === 'undefined' || !town || town.scenario !== 'blank') return s;
  const cap = (m: string, r: string) => /^[A-Z]/.test(m) ? r.charAt(0).toUpperCase() + r.slice(1) : r;
  const sub = (re: RegExp, r: string) => { s = s.replace(re, (m: string) => cap(m, r)); };
  if (!town.tavern) sub(/\b(?:the |this )?(?:tavern|taberna|inn)\b/gi, 'the camp fire');
  if (!town.church) sub(/\b(?:the |this )?(?:chapel|church|temple|shrine)\b/gi, 'the clearing');
  sub(/\b(?:the |this )?(?:square|plaza|forum|village green)\b/gi, 'the clearing');
  sub(/\b(?:the |our )?(?:high street|streets?|lanes?|roads?)\b/gi, 'the path');
  sub(/\bthe well\b/gi, 'the shore');
  sub(/\b(?:the )?(?:market hall|market|stalls?)\b/gi, 'the beach');
  s = s.replace(/\btownsfolk\b/gi, 'islanders').replace(/\b(town|village)\b/gi, (m: string) => cap(m, 'island'));
  return s;
}

/* ---- stand-ins for the old speech and belief calls (all quiet; the new engine replaces them) ---- */
const cvSpeak = (s: string) => s;
const cvSpeechOf = (_o: any, t: string, _l?: any) => t;
const cvMe = (_o: any, t: string) => t;
const cvSaw = (..._a: any[]): any => null;
const kinWord = (_n: any, _o: any) => '';
const himHer = (o: any) => o && o.female ? 'her' : 'him';
const HeShe = (o: any) => o && o.female ? 'She' : 'He';
const TRAIT_SEEN: any = {};
const SB: any = { presim: false, pair: new Map(), count: {}, feat: {} };
const sbPresim = (..._a: any[]) => {};
const sbWhy = (..._a: any[]) => {};
const sbTrust = (..._a: any[]) => {};
const sbResp = (..._a: any[]) => {};
const sbTrim = (..._a: any[]) => {};
const sbRelFromEvent = (..._a: any[]) => {};
const sbImp = (..._a: any[]) => 0.5;
const sbWhoId = (_o: any, ev: any) => ev.actor;
const sbPassOn = (_a: any, _b: any, ev: any): any => ({ who: ev.actor, a: true });
const sbText = (_o: any, ev: any) => ev.text;
const sbNewsLines = (..._a: any[]): any => ['', ''];
const sbPick = (opts: any[]) => opts[0];
const sbSmallTalk = (..._a: any[]): any[] => [];
const focusOn = () => false;
const hasNews = (_n: any) => false;
const talkMarks = (_p: any) => new Map();
const refreshMarks = () => {};
let talkS: any = null;

/** while somebody is in a conversation their needs stand still (nobody starves or wets themselves mid-chat, and long talks do not throw the day off) */
const talkPaused = (n: any) => (n.talkUntil || 0) > game.time && n.pose !== 'sleep';
