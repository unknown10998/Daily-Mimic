import { v4 as uuid } from 'uuid';
import { currentDateIso, nextUtcMidnightIso, sanitizeText } from '../utils/text';
import { redisStorage } from './redisStorage';
import type { AchievementDefinition, AchievementDisplay, AIEvolution, AIStyle, Answer, DailyStatistics, GameState, LevelProgress, PlayerProfile, Question, Streak, Vote } from '../types/game';

const DEFAULT_PHASES = {
  answerDurationMinutes: 18 * 60,
  votingDurationMinutes: 6 * 60,
};

const createInitialStreak = (): Streak => ({
  current: 0,
  best: 0,
});

const getXpRequirementForLevel = (level: number): number => Math.round((5 * level ** 2) * 1.05 ** level) + 10;

const ACHIEVEMENT_REWARD_IDS_KEY = 'achievementRewardIds';

type AchievementRule = AchievementDefinition & {
  earned: (profile: PlayerProfile, levelProgress: LevelProgress) => boolean;
};

const ACHIEVEMENTS: AchievementRule[] = [
  { id: 'first-answer', title: 'First Voice', description: 'Submit your first daily answer.', xpReward: 10, earned: (profile) => profile.totalAnswers >= 1 },
  { id: 'answer-5', title: 'Getting Comfortable', description: 'Submit 5 daily answers.', xpReward: 25, earned: (profile) => profile.totalAnswers >= 5 },
  { id: 'answer-25', title: 'Regular', description: 'Submit 25 daily answers.', xpReward: 75, earned: (profile) => profile.totalAnswers >= 25 },
  { id: 'answer-100', title: 'Hundred Stories', description: 'Submit 100 daily answers.', xpReward: 250, earned: (profile) => profile.totalAnswers >= 100 },
  { id: 'answer-365', title: 'Year Of Prompts', description: 'Submit 365 daily answers.', xpReward: 1000, earned: (profile) => profile.totalAnswers >= 365 },
  { id: 'first-vote', title: 'First Read', description: 'Make your first investigation vote.', xpReward: 10, earned: (profile) => profile.totalVotes >= 1 },
  { id: 'vote-10', title: 'Investigator', description: 'Make 10 investigation votes.', xpReward: 30, earned: (profile) => profile.totalVotes >= 10 },
  { id: 'vote-50', title: 'Pattern Finder', description: 'Make 50 investigation votes.', xpReward: 100, earned: (profile) => profile.totalVotes >= 50 },
  { id: 'vote-100', title: 'Case File', description: 'Make 100 investigation votes.', xpReward: 250, earned: (profile) => profile.totalVotes >= 100 },
  { id: 'vote-500', title: 'Deep Archive', description: 'Make 500 investigation votes.', xpReward: 1250, earned: (profile) => profile.totalVotes >= 500 },
  { id: 'correct-1', title: 'Right Once', description: 'Get 1 investigation call correct.', xpReward: 15, earned: (profile) => profile.correctVotes >= 1 },
  { id: 'correct-10', title: 'Sharp Eye', description: 'Get 10 investigation calls correct.', xpReward: 50, earned: (profile) => profile.correctVotes >= 10 },
  { id: 'correct-50', title: 'Lie Detector', description: 'Get 50 investigation calls correct.', xpReward: 150, earned: (profile) => profile.correctVotes >= 50 },
  { id: 'correct-100', title: 'Human Signal', description: 'Get 100 investigation calls correct.', xpReward: 350, earned: (profile) => profile.correctVotes >= 100 },
  { id: 'streak-3', title: 'Three In A Row', description: 'Reach a 3-call streak.', xpReward: 40, earned: (profile) => profile.streak.best >= 3 },
  { id: 'streak-7', title: 'Week Reader', description: 'Reach a 7-call streak.', xpReward: 100, earned: (profile) => profile.streak.best >= 7 },
  { id: 'streak-30', title: 'Month Mind', description: 'Reach a 30-call streak.', xpReward: 500, earned: (profile) => profile.streak.best >= 30 },
  { id: 'streak-100', title: 'Unbroken Thread', description: 'Reach a 100-call streak.', xpReward: 2000, earned: (profile) => profile.streak.best >= 100 },
  { id: 'streak-365', title: 'Full Orbit', description: 'Reach a 365-call streak.', xpReward: 10000, earned: (profile) => profile.streak.best >= 365 },
  { id: 'level-2', title: 'Level Up', description: 'Reach level 2.', xpReward: 15, earned: (_profile, levelProgress) => levelProgress.level >= 2 },
  { id: 'level-5', title: 'Climbing', description: 'Reach level 5.', xpReward: 50, earned: (_profile, levelProgress) => levelProgress.level >= 5 },
  { id: 'level-10', title: 'Double Digits', description: 'Reach level 10.', xpReward: 150, earned: (_profile, levelProgress) => levelProgress.level >= 10 },
  { id: 'level-25', title: 'Quarter Century', description: 'Reach level 25.', xpReward: 500, earned: (_profile, levelProgress) => levelProgress.level >= 25 },
  { id: 'level-50', title: 'Seasoned Mimic', description: 'Reach level 50.', xpReward: 1500, earned: (_profile, levelProgress) => levelProgress.level >= 50 },
  { id: 'level-100', title: 'Centurion', description: 'Reach level 100.', xpReward: 5000, earned: (_profile, levelProgress) => levelProgress.level >= 100 },
  { id: 'level-500', title: 'Signal Tower', description: 'Reach level 500.', xpReward: 50000, earned: (_profile, levelProgress) => levelProgress.level >= 500 },
  { id: 'score-100', title: 'Triple Digits', description: 'Reach 100 XP.', xpReward: 50, earned: (profile) => profile.totalScore >= 100 },
  { id: 'score-1000', title: 'Four Figures', description: 'Reach 1,000 XP.', xpReward: 250, earned: (profile) => profile.totalScore >= 1000 },
  { id: 'secret-three-year-streak', title: 'Evergreen Read', description: 'Hold a streak of 3 years or more.', xpReward: 100000, secret: true, earned: (profile) => profile.streak.best >= 1095 },
  { id: 'secret-level-3000', title: 'Above The Machine', description: 'Reach a level above 3000.', xpReward: 500000, secret: true, earned: (_profile, levelProgress) => levelProgress.level > 3000 },
];

const getAchievementRewardIds = (profile: PlayerProfile): string[] => {
  const rewardIds = profile.preferences?.[ACHIEVEMENT_REWARD_IDS_KEY];
  if (!Array.isArray(rewardIds)) return [];
  return rewardIds.filter((item): item is string => typeof item === 'string');
};

const AI_STYLES: AIStyle[] = [
  {
    id: 'grounded-memory',
    name: 'Grounded Memory',
    month: 'January',
    answerGuidance: 'Use a broad, believable memory style: concrete setting, ordinary stakes, and one imperfect human detail.',
    questionGuidance: 'Ask open-ended questions that invite real memories, routines, places, and personal context.',
  },
  {
    id: 'casual-social',
    name: 'Casual Social',
    month: 'February',
    answerGuidance: 'Sound like a relaxed person explaining something to a friend: clear, specific, and lightly conversational.',
    questionGuidance: 'Ask about relationships, social moments, small conflicts, preferences, and everyday decisions.',
  },
  {
    id: 'reflective-honest',
    name: 'Reflective Honest',
    month: 'March',
    answerGuidance: 'Use honest reflection without sounding polished: one concrete example, one small uncertainty, and a natural emotional turn.',
    questionGuidance: 'Ask questions that invite opinions, lessons learned, mixed feelings, and memories with a reason behind them.',
  },
  {
    id: 'plainspoken-practical',
    name: 'Plainspoken Practical',
    month: 'April',
    answerGuidance: 'Keep it direct and practical. Use plain words, natural pacing, and avoid clever or literary phrasing.',
    questionGuidance: 'Ask direct questions about choices, habits, repairs, mistakes, and things people actually do.',
  },
  {
    id: 'sensory-everyday',
    name: 'Sensory Everyday',
    month: 'May',
    answerGuidance: 'Anchor the answer in broad sensory reality: sound, texture, light, weather, movement, or a physical object.',
    questionGuidance: 'Ask about scenes people can picture, including public moments, errands, rooms, weather, and objects.',
  },
  {
    id: 'warm-candid',
    name: 'Warm Candid',
    month: 'June',
    answerGuidance: 'Feel warm and candid, like someone answering without overthinking. Include a small admission or aside.',
    questionGuidance: 'Ask about comforts, preferences, seasonal rituals, family habits, and small honest admissions.',
  },
  {
    id: 'visual-specific',
    name: 'Visual Specific',
    month: 'July',
    answerGuidance: 'Make the answer easy to picture. Include one visual detail that directly supports the answer.',
    questionGuidance: 'Ask questions that can be answered with a specific scene, object, face, room, or remembered image.',
  },
  {
    id: 'message-like',
    name: 'Message Like',
    month: 'August',
    answerGuidance: 'Sound like a real short message: natural, slightly uneven, specific, and not essay-shaped.',
    questionGuidance: 'Ask about timing, reactions, delayed thoughts, communication, and things people almost forgot.',
  },
  {
    id: 'lived-in-detail',
    name: 'Lived In Detail',
    month: 'September',
    answerGuidance: 'Use practical lived-in detail: routines, objects, constraints, and one reason the answer matters.',
    questionGuidance: 'Ask about routines, kept habits, objects, personal rules, and things people repeat over time.',
  },
  {
    id: 'low-key-tension',
    name: 'Low Key Tension',
    month: 'October',
    answerGuidance: 'Use mild tension, hesitation, or contrast while staying ordinary and believable.',
    questionGuidance: 'Ask about awkward moments, familiar places, small fears, suspense, surprise, and near-misses.',
  },
  {
    id: 'thoughtful-social',
    name: 'Thoughtful Social',
    month: 'November',
    answerGuidance: 'Sound thoughtful but not sentimental. Include people, context, and a specific reason for the answer.',
    questionGuidance: 'Ask about gratitude, forgiveness, leftovers, family patterns, decisions, and what people notice later.',
  },
  {
    id: 'quiet-summary',
    name: 'Quiet Summary',
    month: 'December',
    answerGuidance: 'Use calm summary and concrete detail. Sound like someone looking back on a day, habit, or small ending.',
    questionGuidance: 'Ask about endings, summaries, comforts, personal changes, routines, and what stuck with someone.',
  },
];

export const gameEngine = {
  sanitizeAnswerText: (text: string): string => {
    const clean = sanitizeText(text);
    return clean.slice(0, 1000);
  },

  buildQuestion: (text: string, generatedByAIEvolution = false, date = currentDateIso(), aiStyle?: AIStyle): Question => {
    const now = new Date().toISOString();
    return {
      id: `question:${date}`,
      text: text.trim(),
      date,
      createdAt: now,
      activeFrom: `${date}T00:00:00.000Z`,
      activeUntil: nextUtcMidnightIso(date),
      isPublished: true,
      generatedByAIEvolution,
      sourceHint: aiStyle ? `AI style: ${aiStyle.name}` : undefined,
    };
  },

  buildAnswer: (questionId: string, authorId: string, text: string, authorType: Answer['authorType'] = 'human'): Answer => {
    const submittedAt = new Date().toISOString();
    return {
      id: `answer:${uuid()}`,
      questionId,
      authorId,
      authorType,
      text: text.trim(),
      submittedAt,
      source: authorType === 'human' ? 'user' : authorType === 'hybrid' ? 'hybrid' : 'gemini',
      markers: {
        length: text.length,
        hasUrls: /https?:\/\//.test(text),
        hasPersonalDetail: /\b(I|my|me|we|our|us)\b/i.test(text),
      },
      voteCount: 0,
      correctVoteCount: 0,
      isVisible: true,
    };
  },

  buildVote: (questionId: string, answerId: string, voterId: string, voteType: Vote['voteType'], correct: boolean, reasoning?: string, confidence: Vote['confidence'] = 'medium', reasoningUseful = false): Vote => ({
    id: `vote:${uuid()}`,
    questionId,
    answerId,
    voterId,
    voteType,
    confidence,
    reasoning,
    reasoningUseful,
    submittedAt: new Date().toISOString(),
    isCorrect: correct,
  }),

  buildPlayerProfile: (playerId: string, username: string): PlayerProfile => ({
    playerId,
    username,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    totalScore: 0,
    totalVotes: 0,
    correctVotes: 0,
    totalAnswers: 0,
    streak: createInitialStreak(),
    achievements: [],
  }),

  initialGameState: (): GameState => {
    const today = currentDateIso();
    return {
      phase: 'answering',
      activeDate: today,
      nextRolloverAt: nextUtcMidnightIso(today),
      answerDeadlineAt: nextUtcMidnightIso(today),
      votingDeadlineAt: nextUtcMidnightIso(today),
      questionIds: [],
    };
  },

  ensurePlayerProfile: async (playerId: string, username: string): Promise<PlayerProfile> => {
    let profile = await redisStorage.getPlayerProfile(playerId);
    if (!profile) {
      profile = gameEngine.buildPlayerProfile(playerId, username);
      await redisStorage.savePlayerProfile(profile);
    }
    return profile;
  },

  buildLevelProgress: (score: number): LevelProgress => {
    let level = 1;
    let currentLevelXp = Math.max(0, score);
    let nextLevelRequirement = getXpRequirementForLevel(level);

    while (currentLevelXp >= nextLevelRequirement) {
      currentLevelXp -= nextLevelRequirement;
      level += 1;
      nextLevelRequirement = getXpRequirementForLevel(level);
    }

    return {
      level,
      xp: Math.max(0, score),
      currentLevelXp,
      nextLevelRequirement,
      progressPercent: Math.round((currentLevelXp / nextLevelRequirement) * 100),
    };
  },

  syncAchievements: (profile: PlayerProfile): AchievementDisplay[] => {
    const unlocked = new Set(profile.achievements);
    const rewarded = new Set(getAchievementRewardIds(profile));
    let changed = true;

    while (changed) {
      changed = false;
      const levelProgress = gameEngine.buildLevelProgress(profile.totalScore);

      ACHIEVEMENTS.forEach((achievement) => {
        if (!achievement.earned(profile, levelProgress)) return;

        if (!unlocked.has(achievement.id)) {
          unlocked.add(achievement.id);
          changed = true;
        }

        if (!rewarded.has(achievement.id)) {
          rewarded.add(achievement.id);
          profile.totalScore += achievement.xpReward;
          changed = true;
        }
      });
    }

    profile.achievements = [...unlocked];
    profile.preferences = {
      ...profile.preferences,
      [ACHIEVEMENT_REWARD_IDS_KEY]: [...rewarded],
    };

    return ACHIEVEMENTS.flatMap((achievement): AchievementDisplay[] => {
      const isUnlocked = unlocked.has(achievement.id);
      if (!isUnlocked) {
        return [{
          id: achievement.id,
          title: achievement.secret ? 'Secret achievement' : 'Locked achievement',
          description: achievement.secret ? 'Hint: a legendary long-term milestone is hidden here.' : `Hint: ${achievement.hint ?? achievement.description}`,
          hint: achievement.hint ?? achievement.description,
          xpReward: achievement.xpReward,
          secret: achievement.secret,
          unlocked: false,
        }];
      }

      return [{
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        hint: achievement.hint,
        xpReward: achievement.xpReward,
        secret: achievement.secret,
        unlocked: isUnlocked,
      }];
    });
  },

  buildDailyStatistics: (questionId: string, answers: Answer[], votes: Vote[], date = currentDateIso()): DailyStatistics => {
    const totalAnswers = answers.length;
    const totalVotes = votes.length;
    const accuracy = totalVotes === 0 ? 0 : votes.filter((vote) => vote.isCorrect).length / totalVotes;
    const answerById = new Map(answers.map((answer) => [answer.id, answer]));
    const detectionRateFor = (authorType: Answer['authorType']): number => {
      const typeVotes = votes.filter((vote) => answerById.get(vote.answerId)?.authorType === authorType);
      return typeVotes.length === 0 ? 0 : typeVotes.filter((vote) => vote.isCorrect).length / typeVotes.length;
    };

    const mostBelievableHuman = answers
      .filter((answer) => answer.authorType === 'human')
      .sort((a, b) => b.voteCount - a.voteCount)[0];

    const mostObviousAI = answers
      .filter((answer) => answer.authorType === 'ai')
      .sort((a, b) => a.voteCount - b.voteCount)[0];

    return {
      questionId,
      date,
      totalAnswers,
      totalVotes,
      overallAccuracy: accuracy,
      humanDetectionRate: detectionRateFor('human'),
      aiDetectionRate: detectionRateFor('ai'),
      hybridDetectionRate: detectionRateFor('hybrid'),
      mostBelievableHumanAnswerId: mostBelievableHuman?.id,
      mostObviousAIAnswerId: mostObviousAI?.id,
      votersWithPerfectScore: 0,
      topPlayerIds: [],
    };
  },

  buildAIEvolutionLesson: (questionId: string, observations: string[], humanPatterns: string[], aiPatterns: string[], guidance: string): AIEvolution["history"][number] => ({
    date: currentDateIso(),
    questionId,
    observations,
    mistakesToAvoid: aiPatterns,
    humanPatterns,
    aiPatterns,
    nextPromptGuidance: guidance,
    generatedAt: new Date().toISOString(),
  }),

  getAIEvolutionSummary: async (): Promise<string> => {
    const evolution = await redisStorage.getAIEvolution();
    const latest = evolution?.history.at(-1);
    return latest?.nextPromptGuidance ?? 'Start with conversational tone, personal detail, and moderate grammar.';
  },

  getMonthlyAIStyle: (date = currentDateIso()): AIStyle => {
    const month = new Date(`${date}T00:00:00.000Z`).getUTCMonth();
    const fallbackStyle = AI_STYLES[0];
    if (!fallbackStyle) {
      throw new Error('No AI styles are configured.');
    }
    return AI_STYLES[month] ?? fallbackStyle;
  },

  getAIStyleClue: (date = currentDateIso()): string => {
    const style = gameEngine.getMonthlyAIStyle(date);
    return `This month, Mimic is leaning ${style.name.toLowerCase()}.`;
  },

  getWeeklyTheme: (date = currentDateIso()): string => {
    const themes = ['Tiny routines', 'Objects with memory', 'Almost mistakes', 'Weather and rooms', 'Food and errands', 'Old messages', 'Public moments'];
    const start = new Date(`${date}T00:00:00.000Z`);
    const week = Math.floor(start.getTime() / (7 * 24 * 60 * 60 * 1000));
    return themes[Math.abs(week) % themes.length] ?? 'Tiny routines';
  },

  getLevelRank: (level: number): { levelRank: string; adjective: string } => {
    if (level >= 500) return { levelRank: 'Mythic', adjective: 'legendary' };
    if (level >= 100) return { levelRank: 'Master', adjective: 'razor-sharp' };
    if (level >= 50) return { levelRank: 'Expert', adjective: 'seasoned' };
    if (level >= 25) return { levelRank: 'Adept', adjective: 'clever' };
    if (level >= 10) return { levelRank: 'Scout', adjective: 'curious' };
    return { levelRank: 'Rookie', adjective: 'fresh-eyed' };
  },

  extractHumanPatterns: (answers: Answer[]): string[] => {
    const humanAnswers = answers.filter((answer) => answer.authorType === 'human');
    const patterns = [
      humanAnswers.some((answer) => /\b(i|my|me|we|our|us)\b/i.test(answer.text)) ? 'Human answers used first-person detail.' : undefined,
      humanAnswers.some((answer) => /\b(mom|dad|friend|sister|brother|grandma|grandpa|teacher|neighbor)\b/i.test(answer.text)) ? 'Human answers mentioned a specific relationship.' : undefined,
      humanAnswers.some((answer) => /\b(smell|sound|taste|cold|warm|rain|light|kitchen|car|room|street)\b/i.test(answer.text)) ? 'Human answers leaned on sensory or place-based detail.' : undefined,
      humanAnswers.some((answer) => answer.text.includes(',') || answer.text.includes('...')) ? 'Human answers had natural pauses instead of perfect structure.' : undefined,
    ].filter((item): item is string => item !== undefined);

    return patterns.length > 0 ? patterns : ['Human answers were short, direct, and specific when they felt believable.'];
  },

  answerDurationMs: (): number => DEFAULT_PHASES.answerDurationMinutes * 60 * 1000,

  votingDurationMs: (): number => DEFAULT_PHASES.votingDurationMinutes * 60 * 1000,
};
