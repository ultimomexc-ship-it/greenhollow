/* On a blank island nobody should talk about places that are not there. The words of the old village are turned into what is: the tavern into the camp fire,
   the square into the clearing, the street into the path, the town into the island. A place you have built (a tavern, a chapel) keeps its own name. */

function placeWords(s: string): string {
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
