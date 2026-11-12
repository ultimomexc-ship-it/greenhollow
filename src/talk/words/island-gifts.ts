/* Words: the island voice, gifts, tastes, apologies and favours. Lines only (lxi, LXI, kidi, LXLI); the acts that say them are in the files that define ACTS. The one-sentence LXI entries are the short plain lines the voice rule leans on (keep them one sentence). */
lxi('offer_gift', 'I have {item}. I thought of you, which surprised me.');
lxi('offer_gift', 'This is {item}. It is not much. It is what I had.');
lxi('gift_thanks', 'Thank you. I will find a place for it.');
lxi('gift_thanks', 'Thank you. I did not expect that today.');
lxi('gift_delight', 'I was about to go and look for that. Thank you.');
lxi('gift_delight', 'That is exactly right. I do not know how you knew.');
lxi('gift_amends', 'It does not undo it. It does help. I am noting that it helps.');
lxi('gift_amends', 'That is {item}. I accept it. I will stop being angry on Thursday.');
lxi('gift_refuse', 'No. I would rather not owe you anything.');
lxi('gift_refuse', 'I do not want that. Please take it back.');
lxi('ask_preference', 'What do you like? I am not asking for a reason. I am collecting.');
lxi('ask_preference', 'If you could have one thing, which would it be? I am only asking.');
lxi('tell_preference', 'I like {item}. That has been true for a long time.', { how: 'like' });
lxi('tell_preference', '{item}. If you are asking. I rarely say it aloud.', { how: 'like' });
lxi('tell_preference', 'I do not like {item}. It is not a strong feeling. It is a stable one.', { how: 'dislike' });
lxi('hint_gift', 'I am fond of {item}. I mention it only because it is true.');
lxi('hint_gift', 'I like {item} very much. It is the sort of thing a person might remember.');
lxi('hint_noted', 'Noted. I will remember that. I remember things.');
lxi('hint_noted', 'Is that so. I have written it down in my head.');
lxi('gift_loved', 'That is {item}. It is my favourite. I do not know how you found out.');
lxi('gift_loved', 'Exactly right. I want to say more, and I have run out of words.');
lxi('gift_disliked', 'Ah. {item}. Thank you. I will find somebody to give it to.');
lxi('gift_disliked', 'It is kind. I do not like it. Both of those are true.');
lxi('offer_gift', 'This is for the other day. I do not like to be owed things.', { how: 'return' });
lxi('offer_gift', 'You gave me something. I am returning the favour in kind. Almost in kind.', { how: 'return' });
lxi('send_gift', 'Could you take {item} to {about}? Without saying it is from me. I realise this is a strange request.');
lxi('send_gift', 'I have {item} for {about}. I would like it to arrive without a name on it.');
lxi('deliver_yes', 'I will take it. I will not say who. I am good at not saying who.');
lxi('deliver_no', 'I would rather not. I would rather not be in the middle of anything today.');
lxi('gift_from_nobody', 'This is for you. I was asked not to say who. I am honouring that.');
lxi('gift_from_nobody', 'Somebody wanted you to have this. I will say no more than that.');
lxi('gift_anon_reply', 'Who would leave me this? I have a few ideas. I will check them against each other.', { how: 'plain' });
lxi('gift_anon_reply', 'It is my favourite. Whoever it was has paid attention.', { how: 'like' });
lxi('gift_anon_reply', 'I do not like it. It is thoughtful anyway. Those are separate things.', { how: 'dislike' });
lxi('apologise', 'I have been thinking about what I did. I am sorry. It is a short sentence and it took me a while.');
lxi('apologise', 'I owe you an apology. I am delivering it as promptly as I could manage.');
lxi('accept_apology', 'Thank you. I accept it. I am relieved to have somewhere to put it.');
lxi('reject_apology', 'No. I am not ready. I may be later.');
lxi('ask_favour', 'I have no food. I have had none since this morning. Could you spare {item}?', { how: 'item' });
lxi('ask_favour', 'I am hungry in a very exact way. Do you have any {item}?', { how: 'item' });
lxi('ask_favour', 'I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.', { how: 'bed' });
lxi('ask_favour', 'Would you build me a bed? I would use it for the usual things.', { how: 'bed' });
lxi('chase_favour', 'About the {item}. I am not pressing. I am mentioning it.', { how: 'item' });
lxi('chase_favour', 'I am still without a bed. I mention it only because it is true.', { how: 'bed' });
lxi('favour_give', 'Here. I had it. Now you do.');
lxi('favour_give', 'Take it. It was not doing anything.');
lxi('favour_promise', 'I will see what can be done. I make no claims.');
lxi('favour_promise', 'Give me a few days. I will keep it in mind.');
lxi('favour_no', 'No. I have exactly enough, which is the problem.');
lxi('favour_no', 'I cannot. I am sorry. I do mean it.');
lxi('favour_thanks', 'Thank you. I will remember this.');
lxi('favour_hopeful', 'Thank you. I will be here. Or nearby.');
LXI('hint_noted', [
  'I will remember that. I am not promising what I will do with it.',
  'Noted. I have somewhere to put it.',
  'Good to know. I will keep it somewhere I can find it.'
]);
