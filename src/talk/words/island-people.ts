/* Words: the island voice, opinions, family, advice, work and where people are. Lines only (lxi, LXI, kidi, LXLI); the acts that say them are in the files that define ACTS. The one-sentence LXI entries are the short plain lines the voice rule leans on (keep them one sentence). */
/* ---- words (island) ---- */
lxi('ask_opinion', 'What is {about} like? I would like to know before I have to find out.');
lxi('ask_opinion', 'What do you make of {about}?');
lxi('ask_opinion', 'Do you get on with {about}? Be honest. I am only curious.');
lxi('give_opinion', 'I am fond of {about}. {reason} I do not say that about many people.', { op: 'fond' });
lxi('give_opinion', '{about} is one of the good ones. {reason}', { op: 'fond' });
lxi('give_opinion', '{about} is all right. {reason}', { op: 'like' });
lxi('give_opinion', 'I have nothing against {about}. {reason} That is not nothing.', { op: 'like' });
lxi('give_opinion', 'I do not know {about} well. I have no complaints, and no compliments.', { op: 'neutral' });
lxi('give_opinion', 'There is not much to say about {about}. {reason}', { op: 'neutral' });
lxi('give_opinion', 'I am not keen on {about}. {reason}', { op: 'wary' });
lxi('give_opinion', '{about}? I get tired around {about}. {reason}', { op: 'wary' });
lxi('give_opinion', 'I cannot stand {about}. {reason} I have tried.', { op: 'dislike' });
lxi('give_opinion', 'Keep away from {about} if you can. {reason}', { op: 'dislike' });
lxi('no_view', 'I do not know {about} well enough to say. We have shared a lot of air and very few sentences.');
lxi('no_view', 'No idea. I have hardly spoken to {about}.');
lxi('no_view_g', 'I do not know them well enough to say.');
lxi('no_view_g', 'Hm. I have not formed a view.');
lxi('gossip_person', 'Between us, I am fond of {about}. {reason}', { op: 'fond' });
lxi('gossip_person', 'You should know {about}. {reason} That is all I will say.', { op: 'fond' });
lxi('gossip_person', 'I have a soft spot for {about}. {reason}', { op: 'like' });
lxi('gossip_person', 'I am not sure about {about}. {reason}', { op: 'wary' });
lxi('gossip_person', 'Watch yourself with {about}. {reason}', { op: 'dislike' });
lxi('gossip_person', 'I will say it, since nobody else is listening: I cannot stand {about}. {reason}', { op: 'dislike' });
lxi('gossip_person', 'Have you noticed {about}? {reason}', { op: 'neutral' });
lxi('agree_opinion', 'I think so too. I had hoped it was only me.');
lxi('agree_opinion', 'You are not the only one.');
lxi('differ_opinion', 'Really? I have always got on with them.');
lxi('differ_opinion', 'Hm. I have found them fine. Perhaps we met different ones.');
lxi('ask_family', 'How is {about}?');
lxi('ask_family', 'And {about}? How is {about} getting on?');
lxi('ask_family', 'How is {about}? I realised I had not asked.');
lxi('answer_family', '{about} is well. Busy.', { state: 'fine' });
lxi('answer_family', '{about} is hungry, mostly. We are working on it.', { state: 'hungry' });
lxi('answer_family', '{about} is worn out. I keep telling them to sit down.', { state: 'tired' });
lxi('answer_family', '{about} is in a good mood. I have decided not to question it.', { state: 'glad' });
lxi('answer_family', '{about} has been low. It is not anything I can fix by talking, so I stay close.', { state: 'low' });
lxi('praise', 'You are good to have around. I do not say that to many people.');
lxi('praise', 'I am glad you ended up here. I mean it quite exactly.');
lxi('thank_praise', 'Thank you. I did not expect that.');
lxi('thank_praise', 'That is kind. I will think about it later.');
lxi('tell_rep', 'It is said you {about}. {qty} people have said it to me. I counted.');
lxi('tell_rep', 'I think you should know that people say you {about}.');
lxi('rep_own', 'I know. I have not been helping.');
lxi('rep_deny', 'That is not true. It is the kind of thing that gets said.');
lxi('rep_deny', 'I did not. But I understand why it looks that way.');
lxi('ask_work', 'What do you do with your days, {about}? I am only asking out of interest.');
lxi('answer_work', 'I am a {job}. It is a better job than it sounds, or exactly as good.');
lxi('answer_work', 'I am a {job}. I have done it since I got here. Before that I was somebody else.');
lxi('ask_where', 'Do you know where {about} is? I am not worried. I would like to know.');
lxi('tell_where', '{about} is {reason}. I looked, on the way past. I do not know why.');
lxi('dont_know_where', 'I do not know where {about} is. Nobody tells me anything on this island, and then I am surprised.');
lxi('warn', 'I would be careful around {about}. They {reason}. I say it only because it is true.');
lxi('warn_thanks', 'Thank you. I will take it under advisement. It is a good word, advisement.');
lxi('ask_advice', 'I am hungry. Where would you go for a meal? I am asking for a friend, who is me.');
lxi('give_advice', 'The bakery. It is reliable. It is the most reliable thing here.', {}, ['feature:bakery']);
lxi('give_advice', 'The tavern. It is not what it was. It was never anything.', {}, ['feature:tavern']);
lxi('give_advice', 'Ask around. Somebody has bread. Someone always has bread.');
lxi('brag_child', '{about} is {qty} now. I did not see it happen. I looked away once.');
lxi('brag_child', 'My {about} is {qty}. It is going well. I am rarely asked.');
lxi('congratulate', 'You must be proud. I would be. Is that the word? Yes.');
lxi('congratulate', 'That is wonderful. They are quite something at that age.');
lxi('tell_back', 'Before I came here I {about}. I mention it only because nobody asks.');
lxi('tell_back_reply', 'That is quite a story. I believe it. That is the strange part.');
lxi('tell_back_reply', 'I see. I find I am not surprised. I have stopped being surprised.');
lxi('thanks_where', 'Thank you. I will go and look there. I may not find {them}, but I will have gone.');
lxi('thanks_where', 'Good. That is somewhere to start.');
for (const t of [
  '{about} is {reason}. I looked, on the way past. I do not know why.',
  '{about} was {reason} a short while ago. People stay where they are, mostly.',
  'Try {reason}. I would not swear to it. I would swear to most of it.',
  '{about} is {reason}. I saw them from a distance, which is how I see most people.',
  'I think {about} is {reason}. I have a good feeling about that, in a general way.'
])
  lxi('tell_where', t);
for (const t of [
  'Thank you. That narrows it down.',
  'Good. That is somewhere to start. Thank you.',
  'Right. I will walk that way and see what the island says.'
])
  lxi('thanks_where', t);
LXI('ask_opinion', [
  'How do you find {about}? I am asking out of something between curiosity and need.',
  'What is your view of {about}? I would like one, and I am short.',
  'Tell me about {about}. Leave out the weather.',
  '{about}. What do you make of them? Take your time. I have mine.',
  'How are you with {about}? I never know how people are with people.'
]);
LXI('ask_family', [
  'How is {about} getting on? I mean in the exact sense.',
  'And {about}? I have not seen {about} in a while, which is how I know I should ask.',
  'How has {about} been, since the last time we spoke of {about}?',
  'Is {about} all right? Say yes if you can and the truth if you cannot.',
  'Give me the short version of {about}.'
]);
LXI('agree_opinion', [
  'That is how I see it as well. It is a relief to find out.',
  'Exactly. I have had that opinion for some time and nowhere to put it.',
  'Yes. I had begun to think I imagined it.',
  'I agree. I did not want to be the first to say.',
  'Same. It is nice to be wrong in company, if we are.'
]);
LXI(
  'answer_family',
  [
    '{about} is fine. I have looked, and they appear to be.',
    '{about} is well. I am as surprised as you.',
    '{about} is busy. I say it with pride and mild alarm.'
  ],
  { state: 'fine' }
);
LXI(
  'answer_family',
  ['{about} is cheerful. I do not know why and I am being careful with it.', '{about} is in a good mood. It has the feel of weather.'],
  { state: 'glad' }
);
LXI(
  'answer_family',
  ['{about} is low. I do not have the cure. I have a blanket, which I have offered.', '{about} has been quiet in a way I do not like.'],
  { state: 'low' }
);
LXI(
  'answer_family',
  ['{about} is tired. The kind that is also a mood.', '{about} is worn out. I have suggested sleep. It was received with suspicion.'],
  { state: 'tired' }
);
LXI('praise', [
  'You make the island more bearable. I did not plan to say it, and now it is said.',
  'I wanted to say that you are easy to be around. I have checked, and it is true.',
  'You are good at being here. That is rarer than it sounds.'
]);
LXI('thank_praise', [
  'Thank you. I am going to be careful with that. It is a delicate thing to be handed.',
  'That is kind. I will think about it at a quiet moment.',
  'Thank you. I do not know what to do with my face.'
]);
LXI('congratulate', [
  'That is wonderful. I mean it in the standard way and a little more.',
  'You must be proud. It shows in the way you said it, quietly.',
  'They are doing well, then. It is not always the case. It is good to hear when it is.'
]);
LXI(
  'answer_family',
  ['{about} is ill. A fever. I have been bringing water and being told to go away.', '{about} is unwell. It is not serious. It is not nothing.'],
  { state: 'ill' }
);
LXI('warn', [
  'Be careful with {about}. They {reason}.',
  'A word about {about}. They {reason}.',
  'I would keep an eye on {about}. They {reason}. I have seen it.',
  'You may want to know about {about}. They {reason}.'
]);
LXI('warn_thanks', ['Thank you.', 'I will keep it in mind.', 'I had wondered about that.', 'Noted. Thank you for saying so.', 'I will watch, then.']);
LXI('agree_opinion', ['I think so too.', 'Yes. The same.', 'That is how I find them.']);
LXI('ask_opinion', ['What do you make of {about}?', 'How do you find {about}?', 'Do you know {about}?']);
LXI('ask_family', ['How is {about}?', 'Is {about} well?', 'How is {about} keeping?']);
for (const [st, ls] of [
  ['fine', ['{about} is well.', '{about} is fine.']],
  ['hungry', ['{about} is hungry.']],
  ['tired', ['{about} is tired.', '{about} is worn out.']],
  ['glad', ['{about} is in good spirits.']],
  ['low', ['{about} is low.', '{about} has been quiet.']],
  ['ill', ['{about} is ill.', '{about} has a fever.']]
] as any)
  LXI('answer_family', ls, { state: st });
lxi('call_child', '{about}. Come in. It is getting dark and I would like you inside.');
lxi('call_child', '{about}. Home. The light is going and I count you every evening.');
lxi('tell_rep', 'People say you {about}.');
lxi('tell_rep', 'You {about}, according to {qty} people.');
lxi('tell_rep', 'It is going round that you {about}.');
lxi('tell_rep', 'I heard that you {about}. I thought you would rather know.');
lxi('tell_rep', '{qty} people have told me you {about}. I have not said whether I agree.');
lxi('tell_rep', 'You {about}, they say. I am only the messenger.');
lxi('rep_own', 'It is true.');
lxi('rep_own', 'Yes. I did.');
lxi('rep_own', 'I will not argue with it.');
lxi('rep_own', 'That is fair. I did that.');
lxi('rep_own', 'I know. It is a short list and I am on it.');
lxi('rep_own', 'I cannot say it is wrong.');
lxi('rep_deny', 'That is not true.');
lxi('rep_deny', 'I did not.');
lxi('rep_deny', 'Who said so?');
lxi('rep_deny', 'That was not me. I would know.');
lxi('rep_deny', 'It is a rumour. I have seen what those do.');
lxi('rep_deny', 'Somebody is confusing me with somebody else.');
