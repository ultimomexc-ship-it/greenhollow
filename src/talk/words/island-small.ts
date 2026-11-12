/* Words: the island voice, small talk, jokes, wondering and being short with somebody. Lines only (lxi, LXI, kidi, LXLI); the acts that say them are in the files that define ACTS. The one-sentence LXI entries are the short plain lines the voice rule leans on (keep them one sentence). */
/* small talk */
lxi('remark_time', 'It is {clock}. I checked.');
lxi('remark_time', 'The morning has a lot left in it.', { band: 'morning' });
lxi('remark_time', "The afternoon is the same length as yesterday's, and feels longer.", { band: 'day' });
lxi('remark_time', 'It will be dark soon. I find I am prepared for that.', { band: 'evening' });
lxi('remark_time', 'It is later than it looks.', { band: 'night' });
lxi('remark_time', 'Time here is quiet. I do not think it is slower. I think it is just not in a hurry.');
lxi('remark_place', 'Not much happens {place}. I find I like that.');
lxi('remark_place', 'Something is always about to happen {place}. It has not so far.');
lxi('remark_place', 'I have stood {place} often enough to know where the ground is uneven.');
lxi('remark_place', 'It is a good place to stand, {place}. I have tried others.');
lxi('remark_work', 'The {job} work goes on. It does not seem to mind whether I am there.');
lxi('remark_work', 'I have done the {job} work long enough to stop asking why.');
lxi('remark_work', 'The {job} work went quietly today. I do not entirely trust that.');
lxi('remark_work', 'The {job} work went well. I am being careful about saying so.', { state: 'glad' });
lxi('remark_work', 'The {job} work is the one thing that has not changed since I arrived, and I am glad of it.');
lxi('remark_state', 'I am hungry in the specific way that means soup.', { state: 'hungry' });
lxi('remark_state', 'I have not eaten since this morning. My stomach has opinions.', { state: 'hungry' });
lxi('remark_state', 'I am tired. Not sleepy. Tired in a way a bed would not fix at once.', { state: 'tired' });
lxi('remark_state', 'I could lie down on almost anything. I have been assessing the ground.', { state: 'tired' });
lxi('remark_state', 'I feel unreasonably good today. I have decided not to look into it.', { state: 'glad' });
lxi('remark_state', 'Something went right today. I have not worked out what. I am leaving it alone.', { state: 'glad' });
lxi('remark_state', 'I feel a little like a cupboard someone has left open.', { state: 'low' });
lxi('remark_state', 'Not a good day. Not a bad one either. A day with the lights slightly down.', { state: 'low' });
lxi('agree', 'Mm.');
lxi('agree', 'Yes. I think so.');
lxi('agree', 'That is about right.');
lxi('agree', 'I had not put it that way. But yes.');
lxi('agree', 'It is.');
lxi('callback', 'Last time you mentioned {about}. I have been thinking about it, in the background.');
lxi('callback', 'You brought up {about} before. I remembered. Is there anything new?');
lxi('callback_answer', 'It is much as it was. Thank you for remembering. People do not, usually.');
lxi('callback_answer', 'There is no news. That is also a kind of news.');
lxi('joke', 'Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.');
lxi('joke', 'I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.');
lxi('joke', 'My neighbour talks to his turnips. They have never disagreed with him. I envy that.');
lxi('laugh', 'Ha. Good. I will repeat that to somebody who has not heard it.');
lxi('laugh', 'Ha. That is exactly the right size for a joke.');
lxi('groan', 'I have heard that one. I did not mind hearing it again.');
lxi('groan', 'Oh, no. And yet.');
lxi('wonder', 'I sometimes wonder what the sea does when nobody is looking. I assume the same thing.');
lxi('wonder', 'I wonder why the sky is the shape it is. It must have been decided by somebody.');
lxi('wonder', 'I wonder where the sand came from. The beach was not here before. Or it was. I do not remember.');
lxi('wonder_reply', 'Now I am wondering as well. It is not unpleasant.');
lxi('wonder_reply', 'I could not say. I have a feeling it is better not to.');
kidi('agree', 'Yes.');
kidi('agree', 'I know. I was going to say that.');
kidi('remark_time', 'Is it lunch yet? It feels like lunch.');
kidi('remark_time', 'It is a long day when you are small.');
kidi('remark_place', 'I like it here. There is room to run, and nobody has said not to.');
kidi('remark_work', 'I am helping. Mostly I am watching. It is also work.');
for (const t of [
  'Yes. I was going to say that.',
  'Quite. It is what I think too.',
  'That is right. I am glad somebody said it.',
  'True. It does not make it simpler.',
  'I agree. I wish I did not.',
  'Yes. That is it exactly.',
  'Mm. Yes. I would put it that way.',
  'You are right. I have been thinking so since Tuesday.',
  'Agreed. That is a rare thing.'
])
  lxi('agree', t);
for (const t of [
  'No change. I will tell you if there is.',
  'A little. It is too early to say what kind.',
  'It has gone quiet, which I am choosing to see as progress.',
  'I thought about it again after you left. That was the only development.',
  'Better, I think. I have stopped checking.',
  'Worse, in a small way. I am keeping an eye on it.'
])
  lxi('callback_answer', t);
LXI('remark_place', [
  'I come {place} more than I mean to. I think the ground is fond of me.',
  '{place}. It looks the same as it did, which I am treating as good news.',
  'Something is slightly different {place}. I cannot find what. I will keep looking.',
  'I like it {place} when nobody is. I like it with you here too. That is a small lie.',
  'It is quieter {place} than it used to be. Or I am louder.'
]);
LXI('remark_work', [
  'The {job} work is going. I have stopped timing it.',
  'I think I am good at the {job} work. I have not asked anyone.',
  'The {job} work has a rhythm. I am slightly behind it.',
  'At the {job} work, a good day looks identical to a bad one except for the last hour.'
]);
LXI('joke', [
  'I tried to count the days since I arrived. I lost count at the part where I tried to count.',
  'There is a gull that stands outside the bakery. I think it is in management.',
  'I planted a turnip and told it the plan. It has not commented.',
  'I found a very good stone this morning. I put it down again. That is the whole story and I stand by it.',
  'Someone asked if I had a map. I said the island was the map. He said it was a poor map. We shook on it.',
  "My bed and I have an understanding. It is mine in the evening and the floor's in the morning.",
  'I tried to whistle a tune I do not know. A bird answered with the same tune. I have not whistled since.'
]);
LXI('laugh', [
  'Ha. I will be thinking about that in the night. Thank you.',
  'Ha. Yes. I will use that on someone who has not heard it.',
  'Ha. That is the right size for a joke. They are usually too large.'
]);
LXI('wonder_reply', [
  'I have wondered that too. I did not come to a conclusion. I came to a seat.',
  'I have no answer. I do have a feeling, and it is the same as yours.',
  'That is a good question. It will stay with me. I will not thank you.'
]);
LXI('remark_state', ['I should not be out. I am ill. I wanted to see whether the day was still here.'], { state: 'ill' });
LXI('snap', [
  'Not now. I have used up my patience and it is not yet noon.',
  'Please. Not today. I am holding the day together with one hand.',
  'I do not want to talk. I want that to be enough.'
]);
LXI('snap_back', [
  'There was no need for that. I will remember there was no need.',
  'I was only asking. I will ask somebody else, then, about everything.',
  'Very well. I withdraw the hello.'
]);
LXI('let_it_go', ['All right. Another time. There is plenty of it.', 'I will leave you be. It is the thing I am best at.']);
LXI('remark_place', ['It is quiet here.', 'This is a good spot.', 'Nobody about.', 'The path wants mending.', 'I like this corner.']);
LXI('remark_work', [
  'There is plenty to do.',
  'The work goes on.',
  'I am behind, a little.',
  'It was a full morning.',
  'The work is the same as yesterday.'
]);
LXI('remark_state', ['I am hungry.', 'I could eat.'], { state: 'hungry' });
LXI('remark_state', ['I am tired.', 'I want to sit down.'], { state: 'tired' });
LXI('remark_state', ['I feel well today.', 'It is a good day.'], { state: 'glad' });
LXI('remark_state', ['I am a little low.', 'It is not my best day.'], { state: 'low' });
LXI('remark_state', ['I am not well.', 'I have a fever.'], { state: 'ill' });
lxi('mutter', 'I put it down somewhere. I put it down on purpose.', { how: 'farmer' });
lxi('mutter', 'There will be rain, or there will not. I have decided to be ready for both.', { how: 'farmer' });
lxi('mutter', 'Another row. The rows are the same. I check.', { how: 'farmer' });
lxi('mutter', 'Not too brown. Not too pale. It is a narrow thing and I am calm about it.', { how: 'baker' });
lxi('mutter', 'There is flour in places I did not know I had.', { how: 'baker' });
lxi('mutter', 'Hot enough. It is always hot enough, and then it is hotter.', { how: 'smith' });
lxi('mutter', 'Where did that go. It was here. It was right here.');
lxi('mutter', 'Nearly done. I have said that since morning and it has not been false once.');
lxi('mutter', 'Back to it. The work does not know it is being watched.');
