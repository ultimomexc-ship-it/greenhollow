/* Words: the plain voice, small talk, jokes, wondering and being short with somebody. Lines only (lx, LXP, kidl, LXLP); the acts that say them are in the files that define ACTS. */
lx('remark_time', 'plain', 'Morning goes quickly.', { band: 'morning' });
lx('remark_time', 'plain', 'Half the day gone already.', { band: 'day' });
lx('remark_time', 'plain', "It'll be dark soon.", { band: 'evening' });
lx('remark_time', 'plain', "Late to be about, isn't it.", { band: 'night' });
lx('remark_time', 'plain', 'The days feel long lately.');
lx('remark_time', 'plain', 'Time passes strangely here.');
lx('remark_place', 'plain', 'Quiet {place} today.');
lx('remark_place', 'plain', 'I always end up {place} around now.');
lx('remark_place', 'plain', 'Nice enough, {place}.');
lx('remark_place', 'plain', "It's something, being {place}.");
lx('remark_work', 'plain', 'The {job} work never ends.');
lx('remark_work', 'plain', 'Busy with the {job} work.');
lx('remark_work', 'plain', "I'm getting better at the {job} work. Slowly.");
lx('remark_work', 'plain', "Can't complain about the {job} work.", { state: 'glad' });
lx('remark_state', 'plain', "I'm starving.", { state: 'hungry' });
lx('remark_state', 'plain', 'I could eat a whole loaf.', { state: 'hungry' });
lx('remark_state', 'plain', "I'm worn out.", { state: 'tired' });
lx('remark_state', 'plain', 'I could sleep standing up.', { state: 'tired' });
lx('remark_state', 'plain', "I'm in a good mood, actually.", { state: 'glad' });
lx('remark_state', 'plain', "Can't stop smiling today.", { state: 'glad' });
lx('remark_state', 'plain', 'Not my best day.', { state: 'low' });
lx('remark_state', 'plain', "I've felt better.", { state: 'low' });
lx('agree', 'plain', 'Mm.');
lx('agree', 'plain', 'True.');
lx('agree', 'plain', 'I know what you mean.');
lx('agree', 'plain', 'Yes.');
lx('agree', 'plain', 'It is.');
lx('agree', 'plain', 'Same here.');
lx('agree', 'plain', 'Right.');
lx('callback', 'plain', 'Last time we spoke you brought up {about}. Any news?');
lx('callback', 'plain', 'You mentioned {about} the other day. How did that go?');
lx('callback_answer', 'plain', 'Much as it was. Thank you for asking.');
lx('callback_answer', 'plain', 'Oh, that. It rumbles on.');
lx('joke', 'plain', 'A man told me his wall was holding up the ceiling. It turned out to be the other way round.');
lx('joke', 'plain', "I asked the baker for a loaf of yesterday. He said he'd have it tomorrow.");
lx('joke', 'plain', "My neighbour talks to his turnips. They've never once disagreed with him.");
lx('laugh', 'plain', "Ha! That's a good one.");
lx('laugh', 'plain', "Ha. I'll remember that.");
lx('groan', 'plain', 'Oh, no. Really?');
lx('groan', 'plain', 'That one has a beard.');
lx('wonder', 'plain', 'I wonder what the sea does when nobody is looking.');
lx('wonder', 'plain', 'I sometimes wonder why the days are all the same length.');
lx('wonder_reply', 'plain', "Now you've got me wondering.");
lx('wonder_reply', 'plain', "I couldn't say.");
kidl('agree', 'Yes!');
kidl('agree', 'I know!');
kidl('remark_time', 'Is it time for lunch yet?');
kidl('remark_time', "It's a long day when you're small.");
kidl('remark_place', "I like it here. There's room to run.");
kidl('remark_work', "I'm helping. Mostly I'm watching.");
for (const t of [
  'I know.',
  'Quite.',
  'True enough.',
  "That's right.",
  'Exactly so.',
  "I'd say so.",
  'Yes. Quite.',
  'Without a doubt.',
  "You're not wrong."
])
  lx('agree', 'plain', t);
for (const t of [
  "Nothing new. I'd tell you.",
  'Not since, no.',
  'A little. Not much to tell.',
  'Same as before, really.',
  "Oh, don't ask. Well. Do ask. Later.",
  'Better, I think. Thanks for remembering.'
])
  lx('callback_answer', 'plain', t);
LXP('remark_place', [
  'Pleasant enough {place}.',
  'I like it {place} at this hour.',
  '{place} is a good spot for a think.',
  'Never changes, {place}. I like that.',
  'Always something going on {place}.'
]);
LXP('remark_work', ['Busy with the {job} work, as ever.', 'The {job} work keeps me out of trouble.', "Can't complain about the {job} work."]);
LXP('joke', [
  "A gull stole my lunch. I said that's theft. It said nothing. Typical lawyer.",
  'I told the field to grow faster. It grew slower, out of spite.',
  "My neighbour says the weather's turning. It's the same weather it's always had. New haircut, that's all.",
  'They say good fences make good neighbours. Mine fell over. We get on great.',
  'I put my boots on the wrong feet earlier and walked all day like that. Nobody said a word. Lovely, I thought.',
  "Never trust anyone who says they don't like bread. Or a gull, come to think of it."
]);
LXP('laugh', ['Ha! Good one.', "Ha. That's a good one, that.", "You've got me there."]);
LXP('wonder_reply', ["I've wondered that myself.", 'Hm. Never thought of it.', "Now you've got me thinking."]);
LXP('remark_state', ["I shouldn't be out. I'm not well."], { state: 'ill' });
LXP('snap', ["Not now. I've no patience left today.", 'Oh, leave it, will you.', 'Do I look like I want to talk?']);
LXP('snap_back', ['No need for that.', 'Charming. I was only asking.', 'Suit yourself.']);
LXP('let_it_go', ['All right. Another time.', "Fair enough. I'll leave you be."]);
lx('mutter', 'plain', 'Where did I put that?', { how: 'farmer' });
lx('mutter', 'plain', "Rain tomorrow, or it won't be.", { how: 'farmer' });
lx('mutter', 'plain', 'Another row. And another after that.', { how: 'farmer' });
lx('mutter', 'plain', 'Not too brown. Not too pale.', { how: 'baker' });
lx('mutter', 'plain', 'Flour in everything. Flour in my ears.', { how: 'baker' });
lx('mutter', 'plain', 'Hot enough. Hot enough to argue with.', { how: 'smith' });
lx('mutter', 'plain', 'Again. A little harder.', { how: 'smith' });
lx('mutter', 'plain', 'Now where did that go.');
lx('mutter', 'plain', 'Nearly done. Nearly.');
lx('mutter', 'plain', 'Back to it, then.');
