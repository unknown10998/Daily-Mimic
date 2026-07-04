export type ResponseOption = 'Human' | 'AI' | 'Hybrid';
export type Tone = 'warm' | 'soft';

export const homeStats: { label: string; value: string; tone: Tone }[] = [
  { label: 'Today’s accuracy', value: '72%', tone: 'warm' },
  { label: 'Players active', value: '4,100', tone: 'soft' },
  { label: 'Current streak', value: '8 days', tone: 'soft' },
  { label: 'Evolution level', value: 'Luminous Whisper', tone: 'warm' },
];

export const dailyPrompt = {
  title: 'Today’s prompt',
  question:
    'If the moon could whisper one secret about a city skyline soup, what would it say and why does it taste like a childhood joke?',
  note: 'Your answer will stay hidden until the next investigation round.',
};

export const investigationResponses = [
  {
    id: 'one',
    text: 'The skyline stew needed a pinch of twilight, because each heat shimmer carried the echo of a park bench conversation.',
    correct: 'Hybrid' as ResponseOption,
  },
  {
    id: 'two',
    text: 'It would say the recipe is ancient, boiled under a paper lantern and finished with a secret made from lullabies.',
    correct: 'Human' as ResponseOption,
  },
  {
    id: 'three',
    text: 'A slow simmer of memory oil mixed with digital saffron makes the city taste both familiar and algorithmically precise.',
    correct: 'AI' as ResponseOption,
  },
  {
    id: 'four',
    text: 'The broth contains a note of rain on pavement and a whisper of someone humming a tune while walking home.',
    correct: 'Human' as ResponseOption,
  },
  {
    id: 'five',
    text: 'It would mention a secret ingredient called “afterimage,” crafted by a pair of friends and a smart engine.',
    correct: 'Hybrid' as ResponseOption,
  },
  {
    id: 'six',
    text: 'Designed to feel like the city itself, the soup is measured by heartbeat and finished with a code-sweetened sigh.',
    correct: 'AI' as ResponseOption,
  },
];

export const resultStats = {
  score: 86,
  correct: 5,
  total: 6,
  communityAgree: 62,
  xp: 94,
  streak: 9,
  players: 4100,
};

export const profileSummary = {
  currentStreak: 9,
  longestStreak: 18,
  accuracy: '77%',
  gamesPlayed: 52,
  aiDefeated: 34,
};

export const timelineItems = [
  {
    day: 'Jun 25',
    label: 'Secret recipe',
    result: '4/6 correct',
    badge: 'Lunar survivor',
  },
  {
    day: 'Jun 24',
    label: 'City memories',
    result: '5/6 correct',
    badge: 'Mirror sleuth',
  },
  {
    day: 'Jun 23',
    label: 'Ocean lullaby',
    result: '3/6 correct',
    badge: 'Wave watcher',
  },
  {
    day: 'Jun 22',
    label: 'Forest dinner',
    result: '4/6 correct',
    badge: 'Trail thinker',
  },
];

export const leaderboardData = {
  topPlayers: [
    { name: 'Ari', score: 1384, subtitle: 'Streak master', badge: '🥇' },
    { name: 'Mina', score: 1322, subtitle: 'Pattern whisperer', badge: '🥈' },
    { name: 'Jun', score: 1288, subtitle: 'Clue collector', badge: '🥉' },
  ],
  weekly: [
    { name: 'Pip', score: 482, label: 'fast learner' },
    { name: 'Noor', score: 451, label: 'keen eye' },
    { name: 'Tao', score: 428, label: 'steady hand' },
  ],
  friends: [],
};

export const achievements: { title: string; description: string; tone: Tone }[] = [
  {
    title: 'Seasoned Sleuth',
    description: 'Solved 10 investigations in a row.',
    tone: 'soft',
  },
  {
    title: 'Mimic Mentor',
    description: 'Your predictions matched community consensus 5 times.',
    tone: 'warm',
  },
  {
    title: 'Creative Conjurer',
    description: 'Submitted 30 imaginative answers.',
    tone: 'soft',
  },
];
