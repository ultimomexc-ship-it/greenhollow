/* Words: the island voice, flirting, courting and proposing. Lines only (lxi, LXI, kidi, LXLI); the acts that say them are in the files that define ACTS. The one-sentence LXI entries are the short plain lines the voice rule leans on (keep them one sentence). */
lxi('confront_jealous', 'I heard about you and {about}. I am asking you directly, because it seemed better than not.');
lxi('confront_jealous', 'People say you and {about} are close. I did not know. I would like to.');
lxi('jealous_explain', 'It is not what it sounds like. It is a smaller thing than that.');
lxi('jealous_defiant', 'And if it were? I am allowed. I thought I should say it.');
lxi('jealous_deny', 'That is not true. I do not know where you heard it.');
lxi('flirt', 'You look well. I thought you should know that someone noticed.');
lxi('flirt', 'I have been walking past here more than the route requires.');
lxi('flirt', 'You have a good laugh. I have been counting how often I hear it.');
lxi('flirt_back', 'That is kind. I have noticed you as well. I did not plan to say so.');
lxi('flirt_back', 'Well. That is unexpected. I find that I do not mind.');
lxi('flirt_rebuff', 'That is kind. I am not sure what answer is wanted.');
lxi('flirt_rebuff', 'I think there has been a misunderstanding. A small one. I hope.');
lxi('declare', 'I have been rehearsing this. I am fond of you. It is more than that. I do not have the word.');
lxi('declare', 'I think of you more than the work requires. I thought I should say so.');
lxi('declare_return', 'I have felt it too. Since about the third week. I was waiting for a better moment.');
lxi('declare_return', 'Yes. Good. I was afraid I was the only one on the island.');
lxi('declare_gentle', 'I am sorry. I do not feel it. I would have liked to, it would have been simpler.');
lxi('declare_gentle', 'You are a good person. I know that is not the same thing.');
lxi('ask_to_walk', 'Would you walk out with me? There is not much else to do, but I mean it anyway.');
lxi('ask_to_walk', 'I would like to walk with you. Not for any practical reason.');
lxi('walk_yes', 'Yes. I would like that. I did not expect to say yes today.');
lxi('walk_yes', 'I was hoping you would ask. I had a reply prepared. This is it.');
lxi('walk_later', 'Not yet. Ask me again. I am not refusing.');
lxi('walk_later', 'Give me some days. I am not good at quick answers.');
lxi('walk_no', 'No. I am sorry. I am trying to say it kindly.');
lxi('walk_no', 'I do not think so. I wanted to be clear.');
lxi('propose', 'Will you marry me? I have thought about it for some time, or possibly for about a minute.');
lxi('propose', 'I would like us to be married. I would like it to be on a good day.');
lxi('propose_yes', 'Yes. I will. It is a very quick decision and I find I have no doubts.');
lxi('propose_yes', 'Yes. I thought you would never ask. Yes.');
lxi('propose_later', 'Not yet. Ask me again later. I am not refusing, I am being slow.');
lxi('propose_no', 'No. I am sorry. I cannot, and I would rather say so now.');
for (const t of [
  'Good. I had rehearsed a second answer in case. I will keep it.',
  'I am glad. I was a little frightened. That is private.',
  'Well. That has gone better than the version in my head.'
])
  lxi('glad_courtship', t);
