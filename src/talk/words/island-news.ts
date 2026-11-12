/* Words: the island voice, news and the answers to it, stories, and how events are told. Lines only (lxi, LXI, kidi, LXLI); the acts that say them are in the files that define ACTS. The one-sentence LXI entries are the short plain lines the voice rule leans on (keep them one sentence). */
/* news */
lxi('ask_news', 'Has anything happened? Anything at all. I will take a small one.');
lxi('ask_news', 'Any news?');
lxi('ask_news', 'Have you heard anything? About anyone. About anything.');
lxi('no_news', 'Nothing. A gull stood on the beach for a long time and left.');
lxi('no_news', 'No. I looked, though.');
lxi('no_news', 'Nothing I would call news. The tide is where it was.');
lxi('share_news', 'I saw it myself, so I can tell you. {news}.', { how: 'saw' });
lxi('share_news', 'I was there. {news}. I stood very still.', { how: 'saw', rel: 'friend' });
lxi('share_news', 'I heard that {news}. I cannot vouch for it.', { how: 'told' });
lxi('share_news', 'I overheard something. {news}. I was not meant to, but I was there.', { how: 'overheard' });
lxi('share_news', 'It may not be true. {news}.', { conf: 'low' });
lxi('share_news', 'Between us. {news}.', { rel: 'friend' });
lxi('share_news', 'Here is something. {news}.');
lxi('react_shock', 'Really. I did not expect that.');
lxi('react_shock', 'That is a lot to take in at {clock}.');
lxi('react_shock', 'No. Well. Yes, I suppose it would be that.');
lxi('react_amused', 'I should not laugh. I am, a little.');
lxi('react_amused', 'That is almost too good. I will need a minute.');
lxi('react_sympathy', 'Poor {who}.');
lxi('react_sympathy', 'That is hard on {who}. I hope someone brought them something to eat.');
lxi('react_doubt', 'That does not sound like the island I know.');
lxi('react_doubt', 'Who told you that? Never mind. I would like to hear it twice.');
lxi('react_delight', 'Well. That is good. I will think about it all day.');
lxi('react_delight', 'I am glad. It is a strange thing to be glad about, and I am.');
lxi('react_unmoved', 'I see.');
lxi('react_unmoved', 'Mm. Noted.');
lxi('react_unmoved', 'Well. That is a thing that happened.');
lxi('story_preface', 'I have something to tell you. It is long by the standards of today.');
lxi('story_preface', 'You may want to stand still for this.');
lxi('story_preface', 'I heard something. I have been carrying it around since.');
lxi('story_invite', 'Go on. I have time. I always have time.');
lxi('story_invite', 'Please. Go ahead.');
lxi('story_invite', 'Yes. Tell me. I would like to know.');
LXI('ask_news', [
  'Is there news? I would settle for a small rumour.',
  'What is being said? I mean by people, not the wind.',
  'Have you heard anything I have not? That is a low bar and I would be pleased.',
  'Anything new? I have been staring at the same thing for hours.',
  'What is the island saying today? I am prepared to be unsurprised.'
]);
LXI('no_news', [
  'Nothing. I checked the usual places. They were the usual.',
  'Nothing. A cloud went over. That was about all of it.',
  'Nothing I would call news. A man looked at a wall for some time. That was it.',
  'Nothing. I will tell you the moment there is something, which will be after you have already heard.',
  'No. The island is keeping its counsel today. It does that.',
  'Nothing. Somebody sneezed near the well. People talked of nothing else for a minute.'
]);
LXI('ask_news', ['Any news?', 'What is being said?', 'Has anything happened?', 'What have I missed?']);
LXI('no_news', ['Nothing.', 'No. Nothing.', 'Not that I have heard.', 'It has been quiet.', 'Nothing new.']);
LXI('share_news', ['{news}.', 'You will not have heard. {news}.', 'There is this. {news}.']);
LXI('share_news', ['I saw this. {news}.', '{news}. I was there.'], { how: 'saw' });
LXI('share_news', ['I am told {news}.', 'They say {news}.'], { how: 'told' });
LXI('share_news', ['I overheard this. {news}.'], { how: 'overheard' });
LXI('share_news', ['I am not sure of it. {news}.', 'Possibly. {news}.'], { conf: 'low' });
LXI('react_shock', ['No.', 'That is bad.', 'I did not expect that.']);
LXI('react_amused', ['Ha.', 'That is quite funny.', 'I should not laugh.']);
LXI('react_sympathy', ['Poor soul.', 'That is hard.', 'I am sorry to hear it.']);
LXI('react_doubt', ['Are you sure?', 'I doubt that.', 'Who says so?']);
LXI('react_delight', ['Good.', 'I am glad.', 'That is good to hear.', 'Well. Good.', 'That was kind.']);
// first person: said by the one who did it (TE.text with the speaker)
lxi('ev1:lent_hand', "I did an hour of {t}'s work");
lxi('ev1:sick_visit', 'I sat with {t} because of the fever');
LXI('react_unmoved', ['Huh.', 'Is it. Noted.', 'That does not surprise me.', 'Well. There it is.', 'I will file that.']);

// event wording for the everyday (TE.text, island voice)
lxi('ev:dole', '{t} went hungry, and the council gave out grain');
lxi('ev:repair', '{a} mended something without being asked');
lxi('ev:distract', '{a} kept {t} from their work');
lxi('ev:courting', '{a} began courting {t}, as far as anyone could tell');
lxi('ev:tryst', '{a} and {t} were seen going the same way, twice');
lxi('ev:dice', '{a} won money off {t} at dice');
lxi('ev:sing', '{a} sang, at length, and not well');
lxi('ev:stumble', '{a} fell over, drunk, and stayed there');
lxi('ev:smelly', '{a} smelled like a midden');
lxi('ev:newclothes', '{a} has a new tunic, and mentioned it');
lxi('ev:knock', '{a} knocked on a door at night');
lxi('ev:wake', '{a} woke {t} up for no reason');
