/* ================= dialogue / cv-speech: how speech sounds when it leaves someone's mouth =================
   People contract. Every line the player reads as speech (the talk box, its options, speech bubbles, the Overheard list) passes through
   cvSpeak on the way out, so the banks can stay written plainly and still be heard as "don't", "it's", "I'm", "isn't it".
   Careful where English is careful: an auxiliary at the end of a clause stays whole ("Yes, I am.", "I know what it is."), "I have a ..."
   stays (only "I have been / got / seen ..." becomes "I've"), emphasis in capitals ("I do NOT") is left alone. The chronicle is narration
   and does not pass through here.                                                                                                       */
const CV_NEG: any = { do: "don't", does: "doesn't", did: "didn't", is: "isn't", are: "aren't", was: "wasn't", were: "weren't", have: "haven't", has: "hasn't", had: "hadn't",
  would: "wouldn't", could: "couldn't", should: "shouldn't", must: "mustn't", need: "needn't", will: "won't", shall: "shan't", can: "can't", am: "aren't" };
/** a participle (or an adverb before one) after have/has: "I have been" -> "I've been"; "I have a cat" stays */
const CV_PART = "(?:been|got|gone|done|seen|had|heard|made|said|told|known|taken|given|left|lost|found|come|become|eaten|forgotten|grown|begun|broken|written|spoken|stolen|fallen|won|kept|brought|bought|thought|caught|taught|sold|paid|met|felt|slept|spent|sent|built|lent|meant|put|never|always|just|already|only|ever|still|nearly|barely|hardly|(?!need\\b|seed\\b|shed\\b|bread\\b|red\\b|bed\\b)[a-z]{2,}ed)\\b";
/** the next thing is the end of the clause: no contraction before it ("Yes, it is." "That is, if ...") */
const CV_END = "(?!\\s*(?:[.,!?;:…)\"”]|—|$))";
const cvKeepCase = (from: string, to: string) => /^[A-Z]/.test(from) ? to.charAt(0).toUpperCase() + to.slice(1) : to;
const CV_CONTRACT: [RegExp, (m: string, ...a: string[]) => string][] = [
  // "is it not" -> "isn't it", "am I not" -> "aren't I", "do you not" -> "don't you"
  [/\b(is|are|was|do|does|did|have|has|would|could|should|can|will|am)\s+(it|that|this|there|you|he|she|they|we|I)\s+not\b/gi, (m, aux, pr) => /NOT/.test(m) ? m : cvKeepCase(m, CV_NEG[aux.toLowerCase()] + ' ' + (pr === 'I' || pr === 'i' ? 'I' : pr.toLowerCase()))],
  [/\bcan ?not\b/gi, m => cvKeepCase(m, "can't")],
  [/\b(do|does|did|is|are|was|were|have|has|had|would|could|should|must|need|will|shall)\s+not\b/gi, (m, aux) => /NOT/.test(m) ? m : cvKeepCase(m, CV_NEG[aux.toLowerCase()])],
  [/\bI had better\b/g, () => "I'd better"], [/\b(you|we|they) had better\b/gi, (m, pr) => cvKeepCase(m, pr.toLowerCase() + "'d better")],
  [new RegExp("\\bI am\\b" + CV_END, 'g'), () => "I'm"],
  [new RegExp("\\b(you|we|they) are\\b" + CV_END, 'gi'), (m, pr) => cvKeepCase(m, pr.toLowerCase() + "'re")],
  [new RegExp("\\b(he|she|it|that|there|here|what|who|where|how|everyone|everybody|nobody|somebody|someone|nothing|something|everything) is\\b" + CV_END + "(?!\\s+it\\s*(?:[.,!?;:…]|$))", 'gi'), (m, pr) => cvKeepCase(m, pr.toLowerCase() + "'s")],
  [new RegExp("\\b(I|you|we|they|he|she|it|that|there|who) will\\b" + CV_END, 'gi'), (m, pr) => cvKeepCase(m, (pr === 'I' || pr === 'i' ? 'I' : pr.toLowerCase()) + "'ll")],
  [new RegExp("\\b(I|you|we|they|he|she) would\\b" + CV_END, 'gi'), (m, pr) => cvKeepCase(m, (pr === 'I' || pr === 'i' ? 'I' : pr.toLowerCase()) + "'d")],
  [new RegExp("\\b(I|you|we|they) have(?=\\s+" + CV_PART + ")", 'gi'), (m, pr) => cvKeepCase(m, (pr === 'I' || pr === 'i' ? 'I' : pr.toLowerCase()) + "'ve")],
  [new RegExp("\\b(he|she|it|that|there|who|everyone|nobody|somebody) has(?=\\s+" + CV_PART + ")", 'gi'), (m, pr) => cvKeepCase(m, pr.toLowerCase() + "'s")],
  [/\blet us\b/gi, m => cvKeepCase(m, "let's")],
];
/** a line as it is said out loud */
function cvSpeak(s: string): string {
  if (!s || typeof s !== 'string') return s;
  for (const [re, f] of CV_CONTRACT) s = s.replace(re, f as any);
  return placeWords(s);
}
