/* Words: the island voice, greetings, farewells and the closing words of a talk. Lines only (lxi, LXI, kidi, LXLI); the acts that say them are in the files that define ACTS. The one-sentence LXI entries are the short plain lines the voice rule leans on (keep them one sentence). */
/* ritual */
lxi('greet', 'Morning, {li}.', { band: 'morning' });
lxi('greet', 'Good morning. I woke at some point before this and have been waiting for someone to say it to.', { band: 'morning' });
lxi('greet', 'Afternoon, {li}.', { band: 'day' });
lxi('greet', 'Evening, {li}.', { band: 'evening' });
lxi('greet', 'The light is going. Hello, {li}.', { band: 'evening' });
lxi('greet', 'You are up late, {li}. So am I. I do not know what that proves.', { band: 'night' });
lxi('greet', 'Hello, {li}.');
lxi('greet', '{li}. Good. I was about to go and look for you. For no particular reason.', { rel: 'friend' });
lxi('greet', 'Hello. We have met, I think. Or I have dreamed it, which is possible here.', { rel: 'stranger' });
lxi('greet', '{li}. There you are. Exactly where I expected.', { rel: 'friend' });
lxi('greet_back', 'Hello.');
lxi('greet_back', 'Morning. I was thinking about nothing in particular.', { band: 'morning' });
lxi('greet_back', '{li}. Yes. Hello.');
lxi('greet_back', 'Hello, {li}. I was hoping it would be you.', { rel: 'friend' });
lxi('greet_back', 'Evening. It has been an evening for a while now.', { band: 'evening' });
lxi('pre_close', 'I should go. Something is probably waiting for me.');
lxi('pre_close', 'Well. The day will not do itself.');
lxi('pre_close', 'I have to get back. I will not say to what.');
lxi('pre_close', 'I will let you get on. I have the feeling you have somewhere to be, and so do I.');
lxi('farewell', 'Goodbye, {li}.');
lxi('farewell', 'See you. Same place, same time, roughly.');
lxi('farewell', 'Take care of the next hour. I will take care of this one.', { rel: 'friend' });
lxi('farewell_back', 'Goodbye.');
lxi('farewell_back', 'Yes. Goodbye.');
lxi('farewell_back', 'Mm. See you.');
lxi('greet_back', 'Ah. You. The one with the walls.', { rep: 'vandal' });
lxi('greet_back', 'Hello. I have been looking at our walls more closely lately.', { rep: 'vandal' });
lxi('greet_back', 'Hello. I have moved my valuables. They are in the same place as before, but I am looking at them.', { rep: 'meddler' });
lxi('greet_back', 'Hello. I am keeping my hands in my pockets. It is a habit I have formed.', { rep: 'thief' });
lxi('greet_back', 'Hello. It is good to see you. I mean that exactly.', { rep: 'kind' });
lxi('greet_back', 'Ah, {li}. Good. Today is better already.', { rep: 'kind' });
lxi('greet', 'There you are. I was about to look for you, which is not the same as worrying.', { rel: 'spouse' });
lxi('greet', 'Hello. You are home. That is the best news of the day.', { rel: 'spouse' });
lxi('greet', 'There you are, {li}.', { rel: 'partner' });
lxi('greet', 'It is you. I had hoped for someone else, and then I thought: no.', { rel: 'sibling' });
lxi('greet', '{li}. We have the same eyebrows. I notice every time.', { rel: 'sibling' });
lxi('greet', 'Have you eaten? I ask every time. The answer is never the point.', { rel: 'child' });
lxi('greet', 'Come here. Let me look at you. You are taller or I am less.', { rel: 'child', kid: 'yes' });
lxi('greet', 'Hello. Is there food? I am only asking in general.', { rel: 'parent', age: 'child' });
lxi('greet', 'Hello. How has the day been, from where you were standing?', { rel: 'parent' });
lxi('greet', 'Hello. You are where I left you, or near it.', { rel: 'child' });
lxi('greet', 'There you are. I counted. You were still one.', { rel: 'child' });
lxi('greet_back', 'There you are. I was thinking about you, in a general way.', { rel: 'spouse' });
lxi('greet_back', 'Hello, love. I am here. It is where I live.', { rel: 'spouse' });
lxi('greet_back', 'What now? I am joking. Hello.', { rel: 'sibling' });
lxi('greet_back', 'Hello. Yes, I have eaten. I would tell you if I had not, which is not true.', { rel: 'parent' });
lxi('greet_back', 'Hello. I am here. I am fine. You do not need to look at me like that.', { rel: 'parent' });
lxi('farewell', 'I will see you at the table. I will be the one who is hungry.', { rel: 'spouse' });
lxi('farewell', 'Try not to be an idiot. I say it with love, and with a little concern.', { rel: 'sibling' });
lxi('farewell', 'Wrap up warm. It is a mild island, and still.', { rel: 'child' });
lxi('farewell', 'Bye. I will be home on time. Probably before.', { rel: 'parent' });
lxi('farewell', 'Do not be late home. I will notice and I will say nothing.', { rel: 'child' });
lxi('backchannel', 'Mm.');
lxi('backchannel', 'I see.');
lxi('backchannel', 'Yes. Well.');
lxi('backchannel', 'That is something.');
lxi('backchannel', 'Ah. Yes.');
kidi('greet', 'Hello. I am small, but I noticed you.');
kidi('greet', 'Hello, {li}. I found something. I will not say what.');
kidi('greet', 'Are you going somewhere? I could come. I would be quiet. Mostly.');
kidi('greet_back', 'Hello. I was doing something important.');
kidi('greet_back', 'Hello. I am small, but I am here.');
kidi('farewell', 'Bye. I am going to go and do something. I will not say what.');
kidi('farewell', 'Bye. Do not tell them where I went.');
kidi('farewell_back', 'Bye.');
kidi('pre_close', 'I have to go. There is a thing I am in the middle of.');
kidi('pre_close', 'Can I go now? I am asking nicely.');
for (const t of [
  'Hello. I did not expect to see you, and yet.',
  'Ah, {li}. I was just thinking of something else.',
  'Good. You are here. I was about to start talking to myself.',
  'Hello. It is a day of some kind.',
  '{li}. Yes. There you are.',
  'Ah. Company. I had been preparing for none.',
  'Hello, {li}. I will say it first this time.',
  'Hello. I see you have arrived, as one does.',
  '{li}. Good. I had a thought and nobody to give it to.'
])
  lxi('greet', t);
for (const t of [
  'Hello. I was about to say that.',
  'Ah. Hello. I had a feeling.',
  'Hello. I am pleased and slightly startled.',
  'Yes. Hello. It is that time.',
  'Hello. Come to think of it, I was hoping.',
  'Hello to you, in return.',
  'Good. Hello. That is out of the way.',
  'Hello. I have been standing here on purpose.',
  'Ah, {li}. The island does arrange things.'
])
  lxi('greet_back', t);
for (const t of [
  'I should get on. The day has noticed me.',
  'Well. That is that, for now.',
  'I will leave you to it. You were doing something.',
  'That is the end of what I had.',
  'I should go. I will pretend I have a reason.',
  'I have a few things to be near. I will go and be near them.',
  'Right. The day will want me soon.',
  'I will let the conversation end here. It has had a good run.',
  'Off I go. I will not look back, which is a lie.'
])
  lxi('pre_close', t);
for (const t of [
  'Take care, {li}. The island is small but it has edges.',
  'Until next time. I will be somewhere.',
  'Be well. I mean it in the ordinary way.',
  'Goodbye, {li}. It was a good length.',
  'Mind how you go. There is a lot of ground.',
  'Look after yourself. Somebody has to, and I am here.',
  'All the best. I have no better phrase.',
  'Good day to you. It is, so far.',
  'See you. I say it as a matter of course.'
])
  lxi('farewell', t);
for (const t of [
  'And you.',
  'Yes. Goodbye.',
  'Be well, then.',
  'Off you go. I will watch for a moment.',
  'See you. I will be here, or near.',
  'Goodbye. It was good.',
  'Quite. Goodbye.',
  'Right. Until then.',
  'And the same to you, exactly.'
])
  lxi('farewell_back', t);
/* The plain lines of the island voice (docs/talk-review.md, task D). The voice rule in `lxSay` lets a speaker add an aside on at most one line in four;
   the other three need a short line that just says the thing. These are those lines, for the acts said most. One sentence, exact, no ornament:
   the dryness of the island is in what people choose to mention, not in every line having a second half. Add asides elsewhere; keep this file plain. */

LXI('greet', ['Hello, {li}.', 'There you are.', '{li}.', 'Good day.', 'Hello.']);
LXI('greet', ['Morning.'], { band: 'morning' });
LXI('greet_back', ['Hello.', 'Hello, {li}.', 'Good day.', 'Yes. Hello.']);
LXI('greet_back', ['Morning.'], { band: 'morning' });
LXI('farewell', [
  'Goodbye.',
  'I will go on, then.',
  'See you, {li}.',
  'I should get back.',
  'Until later.',
  'Be well.',
  'That is me.',
  'Right. Goodbye.'
]);
LXI('farewell_back', ['Goodbye.', 'See you.', 'Go well.']);
LXI('pre_close', ['I should get on.', 'Well. I have things to see to.', 'I will let you go.', 'That is all I had.', 'I must go.']);

// registers (tag `reg`): said only by somebody of that manner; the ritual acts and a few replies
LXI('greet', ['Good day, {li}. I will be brief.', 'Greetings, {li}.', 'I have come to say that I am here.'], { reg: 'formal' });
LXI('greet_back', ['Good day. You have found me.', 'Greetings. It is a pleasure, as far as I can tell.', 'Well met, I believe.'], { reg: 'formal' });
LXI('farewell', ['I will take my leave.', 'Farewell, {li}. I will see that it is noted.', 'I bid you good day. I mean it as written.'], { reg: 'formal' });
LXI('farewell_back', ['Farewell.', 'Good day, then.', 'Until we meet again, as we will.'], { reg: 'formal' });
LXI('pre_close', ['I must beg your leave.', 'Forgive me. I have something to attend to.'], { reg: 'formal' });
LXI('greet', ['Hello, {li}. I am glad it is you.', 'There you are. I was about to look for you.', '{li}. Good. Come here.'], { reg: 'warm' });
LXI('greet', ['Hello, friend. I kept the good seat.'], { reg: 'warm', rel: 'friend' });
LXI('greet', ['Hello, love.', 'There you are, love.'], { reg: 'warm', rel: 'spouse' });
LXI('greet', ['Hello, dear. Have you eaten?', 'Hello, my dear.'], { reg: 'warm', rel: 'child' });
LXI('greet_back', ['Oh, hello. Come in.', 'Hello, {li}. You have improved the day.'], { reg: 'warm' });
LXI('greet_back', ['There you are, love.'], { reg: 'warm', rel: 'spouse' });
LXI('farewell', ['Take care of yourself, {li}.', 'Come and see me soon.'], { reg: 'warm' });
LXI('farewell', ['Bye, love. Be careful.'], { reg: 'warm', rel: 'spouse' });
LXI('farewell', ['Bye, dear. Be good.'], { reg: 'warm', rel: 'child' });
LXI('farewell_back', ['Goodbye, {li}. Do come again.', 'Look after yourself.'], { reg: 'warm' });
LXI('farewell_back', ['Bye, friend.'], { reg: 'warm', rel: 'friend' });
LXI('pre_close', ['I am sorry. I must go, and I would rather not.', 'I could talk longer. The work will not allow it.'], { reg: 'warm' });
LXI('acknowledge', ['Very good.', 'That is commendable.', 'I am pleased to hear it.'], { reg: 'formal' });
LXI('acknowledge', ['That is good to hear.', 'Good for you. I mean it.', 'I am glad.'], { reg: 'warm' });
LXI('agree', ['Indeed.', 'Quite so.', 'I concur.'], { reg: 'formal' });
LXI('agree', ['I could not agree more.', 'Yes. That is exactly what I think.'], { reg: 'warm' });
LXI('answer_how', ['I am well, I thank you.', 'Well enough, I thank you for asking.'], { reg: 'formal' });
LXI('answer_how', ['I am well. Better for seeing you, {li}.', 'Well. Thank you for asking.'], { reg: 'warm' });
LXI('greet', ['Morning.', 'Hello.'], { reg: 'terse' });
LXI('farewell', ['Bye.', 'Right. Off I go.'], { reg: 'terse' });
LXI('acknowledge', ['Good.', 'Fine.'], { reg: 'terse' });
