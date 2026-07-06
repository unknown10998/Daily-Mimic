import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { redisStorage } from '../services/redisStorage';
import { gameEngine } from '../services/gameEngine';
import { geminiService } from '../services/geminiService';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AnswerRequest,
  VoteRequest,
} from '../types/api';
import type { AchievementDisplay, Answer, DailyStatistics, GameState, LeaderboardEntry, LevelProgress, PlayerProfile, Question, Vote } from '../types/game';
import { currentDateIso, nextUtcMidnightIso } from '../utils/text';

export const game = new Hono();

type SignupRequest = {
  displayName?: string;
};

type PlayerPreferences = {
  onboarded?: boolean;
  displayName?: string;
  pinnedAchievementIds?: string[];
};

type PinAchievementsRequest = {
  achievementIds?: string[];
};

type GameStats = {
  activeDate: string;
  promptText: string;
  aiStyleName: string;
  aiStyleClue: string;
  weeklyTheme: string;
  totalAnswersToday: number;
  totalVotesToday: number;
  communityAccuracy: number;
  registeredPlayers: number;
  averageScore: number;
  currentStreak: number;
  totalScore: number;
  levelProgress: LevelProgress;
  daysRegistered: number;
};

type VoteHistoryItem = {
  questionId: string;
  questionText: string;
  questionDate: string;
  answerId: string;
  answerText: string;
  selected: Vote['voteType'];
  actual: Answer['authorType'];
  correct: boolean;
  submittedAt: string;
};

type PlayerVoteSummary = {
  answerId: string;
  voteType: Vote['voteType'];
  correct: boolean;
};

type InvestigationAnswer = Answer & {
  isOwnAnswer: boolean;
  authorDisplayName: string;
};

type LeaderboardEntryWithLevel = LeaderboardEntry & {
  level: number;
  levelRank: string;
  adjective: string;
};

type ResultsInsight = {
  difficulty: string;
  communityClues: string[];
  heatmap: {
    human: string[];
    ai: string[];
    hybrid: string[];
  };
};

const XP_REWARDS = {
  dailyAnswer: 5,
  correctVote: 10,
  perfectInvestigation: 25,
  threeStreak: 15,
  hardRead: 20,
  mimicBonus: 20,
  usefulReasoning: 10,
  highConfidenceMissPenalty: 5,
};

const respondOk = <T>(data: T) => ({ status: 'ok' as const, data });
const respondError = (message: string) => ({ status: 'error' as const, message });
const addDays = (date: string, days: number): string => {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

const getYear = (date: string): string => date.slice(0, 4);

const buildAnsweredQuestionRecord = (question: Question, answers: Answer[], votes: Vote[]) => {
  const aiStyle = gameEngine.getMonthlyAIStyle(question.date);
  const humanPatterns = gameEngine.extractHumanPatterns(answers);
  return {
    questionId: question.id,
    date: question.date,
    text: question.text,
    humanAnswerCount: answers.filter((answer) => answer.authorType === 'human').length,
    aiAnswerCount: answers.filter((answer) => answer.authorType === 'ai').length,
    voteCount: votes.length,
    humanPatterns,
    aiStyleName: aiStyle.name,
    recordedAt: new Date().toISOString(),
  };
};

const generateNextQuestionForDate = async (previousQuestion: Question | null, nextDate: string, evolutionLesson: string, humanPatterns: string[]) => {
  const aiStyle = gameEngine.getMonthlyAIStyle(nextDate);
  const weeklyTheme = gameEngine.getWeeklyTheme(nextDate);
  const history = await redisStorage.getAnsweredQuestionHistory(getYear(nextDate));
  const nextQuestionText = await geminiService.generateNextQuestion(previousQuestion?.text ?? '', `${evolutionLesson}\nWeekly theme: ${weeklyTheme}`, history.questions, humanPatterns, aiStyle);
  return gameEngine.buildQuestion(nextQuestionText, true, nextDate, aiStyle);
};


const applyMidnightSchedule = (state: GameState, date: string): void => {
  const nextMidnight = nextUtcMidnightIso(date);
  state.nextRolloverAt = nextMidnight;
  state.answerDeadlineAt = nextMidnight;
  state.votingDeadlineAt = nextMidnight;
};

const advanceGameDay = async (state: GameState, question: Question, context: string): Promise<{ nextQuestion: Question; lesson: string }> => {
  await ensureAIAnswerForQuestion(question);
  const answersWithAI = await redisStorage.getAnswersByQuestion(question.id);
  const votesRaw = await redisStorage.getVotesByQuestion(question.id);
  const votes = Object.values(votesRaw).map((value) => JSON.parse(value) as Vote);
  await redisStorage.saveDailyStatistics(gameEngine.buildDailyStatistics(question.id, answersWithAI, votes, question.date));
  await redisStorage.addAnsweredQuestionRecord(buildAnsweredQuestionRecord(question, answersWithAI, votes));

  const humanPatterns = gameEngine.extractHumanPatterns(answersWithAI);
  const aiReasoningFeedback = await getCorrectAIReasoningFeedback(answersWithAI, votes);
  const answerTypeCounts = {
    human: answersWithAI.filter((answer) => answer.authorType === 'human').length,
    ai: answersWithAI.filter((answer) => answer.authorType === 'ai').length,
    hybrid: answersWithAI.filter((answer) => answer.authorType === 'hybrid').length,
  };
  const observations = [
    context,
    `${answersWithAI.length} answers collected`,
    `${votes.length} votes recorded`,
    `Answer mix: ${answerTypeCounts.human} human, ${answerTypeCounts.ai} AI, ${answerTypeCounts.hybrid} hybrid`,
    `AI style was ${gameEngine.getMonthlyAIStyle(question.date).name}`,
    ...aiReasoningFeedback,
  ];
  const evolutionText = await geminiService.generateEvolutionLesson(question.text, observations.join('\n'), humanPatterns, gameEngine.getMonthlyAIStyle(question.date));
  const lesson = gameEngine.buildAIEvolutionLesson(question.id, observations, humanPatterns, ['AI answers were too formal', 'AI answers avoided uncertainty'], evolutionText);
  const prevEvolution = (await redisStorage.getAIEvolution()) ?? { history: [], lastUpdatedAt: new Date().toISOString() };
  const nextEvolution = { history: [...prevEvolution.history, lesson], lastUpdatedAt: new Date().toISOString() };
  await redisStorage.saveAIEvolution(nextEvolution);

  const nextDate = addDays(state.activeDate, 1);
  const nextQuestion = await generateNextQuestionForDate(question, nextDate, evolutionText, humanPatterns);
  await redisStorage.saveQuestion(nextQuestion);
  await redisStorage.setActiveQuestion(nextQuestion.date, nextQuestion.id);

  state.phase = 'answering';
  state.activeDate = nextQuestion.date;
  state.activeQuestionId = nextQuestion.id;
  applyMidnightSchedule(state, nextQuestion.date);
  state.questionIds = state.questionIds.includes(nextQuestion.id) ? state.questionIds : [...state.questionIds, nextQuestion.id];
  await redisStorage.saveGameState(state);

  return { nextQuestion, lesson: evolutionText };
};


const BOT_PERSONAS = [
  { id: 'bot:neighbor', name: 'mimicbot_neighbor', style: 'notices sounds, errands, and small awkward moments' },
  { id: 'bot:night-owl', name: 'mimicbot_night_owl', style: 'mentions late-night habits, screens, and tired honesty' },
  { id: 'bot:kitchen', name: 'mimicbot_kitchen', style: 'uses food, smell, dishes, and family-room details' },
  { id: 'bot:commuter', name: 'mimicbot_commuter', style: 'answers through buses, cars, sidewalks, and waiting around' },
  { id: 'bot:overthinker', name: 'mimicbot_overthinker', style: 'second-guesses the answer and explains the feeling behind it' },
];

const DEFAULT_BOT_LEADERBOARD_SEED = { score: 37, votes: 7, correctVotes: 3, answers: 5, streak: 1 };

const BOT_LEADERBOARD_SEEDS = [
  { score: 92, votes: 13, correctVotes: 8, answers: 7, streak: 6 },
  { score: 74, votes: 11, correctVotes: 6, answers: 7, streak: 4 },
  { score: 61, votes: 9, correctVotes: 5, answers: 6, streak: 3 },
  { score: 49, votes: 8, correctVotes: 4, answers: 6, streak: 2 },
  DEFAULT_BOT_LEADERBOARD_SEED,
];

const ensureBotLeaderboardProfiles = async (): Promise<void> => {
  await Promise.all(BOT_PERSONAS.map(async (bot, index) => {
    const seed = BOT_LEADERBOARD_SEEDS[index] ?? DEFAULT_BOT_LEADERBOARD_SEED;
    const profile = await gameEngine.ensurePlayerProfile(bot.id, bot.name);
    profile.username = bot.name;
    profile.totalScore = Math.max(profile.totalScore, seed.score);
    profile.totalVotes = Math.max(profile.totalVotes, seed.votes);
    profile.correctVotes = Math.max(profile.correctVotes, seed.correctVotes);
    profile.totalAnswers = Math.max(profile.totalAnswers, seed.answers);
    profile.streak.current = Math.max(profile.streak.current, seed.streak);
    profile.streak.best = Math.max(profile.streak.best, seed.streak);
    profile.lastActiveAt = new Date().toISOString();
    gameEngine.syncAchievements(profile);
    await redisStorage.savePlayerProfile(profile);
  }));
};

const getAnswerAuthorDisplayName = async (answer: Answer, question: Question): Promise<string> => {
  const style = gameEngine.getMonthlyAIStyle(question.date);

  if (answer.authorType === 'ai') {
    return `${style.name} Mimic AI`;
  }

  if (answer.authorType === 'hybrid') {
    return `${style.name} Hybrid Mimic`;
  }

  const bot = BOT_PERSONAS.find((persona) => persona.id === answer.authorId);
  if (bot) {
    return bot.name;
  }

  const profile = await redisStorage.getPlayerProfile(answer.authorId);
  if (answer.authorId.startsWith('bot:')) {
    return profile?.username.startsWith('mimicbot') === true ? profile.username : `mimicbot_${answer.authorId.slice('bot:'.length).replaceAll('-', '_')}`;
  }

  if (profile?.username) {
    return `u/${profile.username}`;
  }

  if (answer.authorId.startsWith('player:')) {
    return `u/${answer.authorId.slice('player:'.length)}`;
  }

  return 'u/anonymous';
};

const getPlayerId = async (): Promise<string> => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    throw new Error('Unable to resolve Reddit username');
  }
  return `player:${username.toLowerCase()}`;
};

const getPlayerProfile = async (): Promise<PlayerProfile> => {
  const playerId = await getPlayerId();
  const username = await reddit.getCurrentUsername();
  const profile = await gameEngine.ensurePlayerProfile(playerId, username ?? 'anonymous');
  return profile;
};

const getPreferences = (profile: PlayerProfile): PlayerPreferences => {
  const preferences = profile.preferences;
  const pinnedAchievementIds = Array.isArray(preferences?.pinnedAchievementIds)
    ? preferences.pinnedAchievementIds.filter((item): item is string => typeof item === 'string')
    : undefined;
  return {
    onboarded: preferences?.onboarded === true,
    displayName: typeof preferences?.displayName === 'string' ? preferences.displayName : undefined,
    pinnedAchievementIds,
  };
};

const isRegistered = (profile: PlayerProfile): boolean => getPreferences(profile).onboarded === true;

const ensureActiveQuestion = async (): Promise<{ question: Question; state: GameState }> => {
  const state = (await redisStorage.getGameState()) ?? gameEngine.initialGameState();
  let question = await redisStorage.getQuestionByDate(state.activeDate);

  if (!question) {
    question = await generateNextQuestionForDate(null, state.activeDate, 'First daily prompt for Mimic.', []);
    await redisStorage.saveQuestion(question);
    await redisStorage.setActiveQuestion(question.date, question.id);
    state.activeQuestionId = question.id;
    state.questionIds = state.questionIds.includes(question.id) ? state.questionIds : [...state.questionIds, question.id];
    applyMidnightSchedule(state, question.date);
    await redisStorage.saveGameState(state);
  }

  const today = currentDateIso();
  let rolloverCount = 0;
  while (state.activeDate < today && rolloverCount < 7) {
    const result = await advanceGameDay(state, question, 'Automatic midnight rollover.');
    question = result.nextQuestion;
    rolloverCount += 1;
  }

  if (state.activeDate < today) {
    state.activeDate = today;
    question = await generateNextQuestionForDate(question, today, 'Catch-up prompt after missed rollover window.', []);
    await redisStorage.saveQuestion(question);
    await redisStorage.setActiveQuestion(question.date, question.id);
    state.phase = 'answering';
    state.activeQuestionId = question.id;
    applyMidnightSchedule(state, question.date);
    state.questionIds = state.questionIds.includes(question.id) ? state.questionIds : [...state.questionIds, question.id];
    await redisStorage.saveGameState(state);
  } else if (state.activeDate > today) {
    const previousQuestion = question;
    state.activeDate = today;
    question = await redisStorage.getQuestionByDate(today) ?? await generateNextQuestionForDate(previousQuestion, today, 'Reset active day back to the real Central Time date.', []);
    await redisStorage.saveQuestion(question);
    await redisStorage.setActiveQuestion(question.date, question.id);
    state.phase = 'answering';
    state.activeQuestionId = question.id;
    applyMidnightSchedule(state, question.date);
    state.questionIds = state.questionIds.includes(question.id) ? state.questionIds : [...state.questionIds, question.id];
    await redisStorage.saveGameState(state);
  } else if (state.nextRolloverAt !== nextUtcMidnightIso(state.activeDate)) {
    applyMidnightSchedule(state, state.activeDate);
    await redisStorage.saveGameState(state);
  }

  return { question, state };
};

const getActiveQuestion = async () => {
  const gameState = await redisStorage.getGameState();
  const date = gameState?.activeDate ?? currentDateIso();
  return await redisStorage.getQuestionByDate(date);
};

const getInvestigationQuestion = async () => {
  const { state } = await ensureActiveQuestion();
  const yesterday = addDays(state.activeDate, -1);
  return await redisStorage.getQuestionByDate(yesterday);
};

const ensureAIAnswerForQuestion = async (question: Question): Promise<void> => {
  const answers = await redisStorage.getAnswersByQuestion(question.id);
  if (answers.some((answer) => answer.authorType === 'ai')) return;

  const guidance = await gameEngine.getAIEvolutionSummary();
  const aiText = await geminiService.generateAnswer(question.text, guidance, gameEngine.getMonthlyAIStyle(question.date));
  await redisStorage.saveAnswer(gameEngine.buildAnswer(question.id, 'ai:mimic', aiText, 'ai'));
};

const isQuestionActive = (question: { activeUntil: string } | null): boolean => {
  if (!question) return false;
  return new Date(question.activeUntil) > new Date();
};

const validateAnswerText = (text: string) => {
  const clean = gameEngine.sanitizeAnswerText(text);
  if (clean.length < 250) {
    throw new Error('Answer must be at least 250 characters long.');
  }
  if (clean.length > 1000) {
    throw new Error('Answer cannot exceed 1000 characters.');
  }
  return clean;
};

const sanitizeReasoning = (text: unknown): string | undefined => {
  if (typeof text !== 'string') return undefined;
  const clean = gameEngine.sanitizeAnswerText(text).slice(0, 400);
  return clean.length > 0 ? clean : undefined;
};

const sanitizeConfidence = (value: unknown): Vote['confidence'] => {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
};

const sanitizeVoteType = (value: unknown): Vote['voteType'] => {
  if (value === 'human' || value === 'ai' || value === 'hybrid') return value;
  throw new Error('Choose Human, AI, or Hybrid.');
};

const talksAboutAI = (text: string): boolean => /\b(ai|bot|robot|machine|generated|model|llm|chatgpt|gemini|automated|too perfect|generic|unnatural)\b/i.test(text);

const updateDailyStreak = (profile: PlayerProfile, activeDate: string): boolean => {
  if (profile.streak.lastSuccessAt === activeDate) return false;

  const expectedPrevious = addDays(activeDate, -1);
  profile.streak.current = profile.streak.lastSuccessAt === expectedPrevious ? profile.streak.current + 1 : 1;
  profile.streak.best = Math.max(profile.streak.best, profile.streak.current);
  profile.streak.lastSuccessAt = activeDate;
  return true;
};

const getPlayerVotesForQuestion = async (questionId: string) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return [];
  const currentPlayerId = `player:${username.toLowerCase()}`;
  const votes = await redisStorage.getVotesByQuestion(questionId);
  return Object.values(votes).filter((vote) => {
    try {
      const parsed = JSON.parse(vote as string);
      return parsed.voterId === currentPlayerId;
    } catch {
      return false;
    }
  });
};

const getPlayerAnswerForQuestion = async (questionId: string, playerId: string): Promise<Answer | null> => {
  const answers = await redisStorage.getAnswersByQuestion(questionId);
  return answers.find((answer) => answer.authorId === playerId) ?? null;
};

const getPlayerVoteSummariesForQuestion = async (questionId: string): Promise<PlayerVoteSummary[]> => {
  const playerVotes = await getPlayerVotesForQuestion(questionId);
  return playerVotes.flatMap((vote) => {
    try {
      const parsed = JSON.parse(vote as string) as Vote;
      return [{
        answerId: parsed.answerId,
        voteType: parsed.voteType,
        correct: parsed.isCorrect,
      }];
    } catch {
      return [];
    }
  });
};

const getCorrectAIReasoningFeedback = async (answers: Answer[], votes: Vote[]): Promise<string[]> => {
  const answersById = new Map(answers.map((answer) => [answer.id, answer]));
  return votes.flatMap((vote) => {
    const answer = answersById.get(vote.answerId);
    if (!answer || answer.authorType !== 'ai' || vote.voteType !== 'ai' || !vote.isCorrect || !vote.reasoning || !talksAboutAI(vote.reasoning)) {
      return [];
    }

    return [`Correct AI call. AI answer excerpt: "${answer.text.slice(0, 220)}" Player clue: ${vote.reasoning}`];
  }).slice(0, 8);
};

const getDifficulty = (accuracy: number): string => {
  if (accuracy >= 0.8) return 'Easy';
  if (accuracy >= 0.55) return 'Tricky';
  if (accuracy >= 0.35) return 'Brutal';
  return 'Chaos';
};

const topWords = (texts: string[]): string[] => {
  const skip = new Set(['this', 'that', 'with', 'from', 'they', 'their', 'because', 'answer', 'answers', 'felt', 'feel', 'like', 'just', 'really', 'would', 'there', 'were', 'more', 'about', 'could', 'probably', 'thing', 'things', 'what', 'when', 'then', 'than', 'have', 'into']);
  const counts = new Map<string, number>();
  texts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gu, ' ')
    .split(/\s+/u)
    .filter((word) => word.length > 3 && !skip.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
};

const heatmapWordsForType = (answers: Answer[], reasonedVotes: Vote[], answersById: Map<string, Answer>, authorType: Answer['authorType']): string[] => {
  const reasoningWords = topWords(reasonedVotes
    .filter((vote) => answersById.get(vote.answerId)?.authorType === authorType)
    .flatMap((vote) => vote.reasoning ? [vote.reasoning] : []));

  if (reasoningWords.length > 0) return reasoningWords;

  return topWords(answers
    .filter((answer) => answer.authorType === authorType)
    .map((answer) => answer.text));
};

const buildResultsInsight = (answers: Answer[], votes: Vote[], accuracy: number): ResultsInsight => {
  const answersById = new Map(answers.map((answer) => [answer.id, answer]));
  const reasonedVotes = votes.filter((vote) => vote.reasoning);
  const communityClues = reasonedVotes.slice(-5).map((vote) => vote.reasoning).filter((reasoning): reasoning is string => typeof reasoning === 'string' && reasoning.length > 0);

  return {
    difficulty: getDifficulty(accuracy),
    communityClues,
    heatmap: {
      human: heatmapWordsForType(answers, reasonedVotes, answersById, 'human'),
      ai: heatmapWordsForType(answers, reasonedVotes, answersById, 'ai'),
      hybrid: heatmapWordsForType(answers, reasonedVotes, answersById, 'hybrid'),
    },
  };
};

const grantAchievementXp = (player: PlayerProfile, achievementId: string, xp: number): number => {
  if (player.achievements.includes(achievementId)) return 0;
  player.achievements = [...player.achievements, achievementId];
  player.totalScore += xp;
  return xp;
};

// GET /api/session
game.get('/session', async (c) => {
  try {
    const profile = await getPlayerProfile();
    const preferences = getPreferences(profile);
    return c.json<ApiSuccessResponse<{ profile: PlayerProfile; registered: boolean; displayName: string }>>(respondOk({
      profile,
      registered: isRegistered(profile),
      displayName: preferences.displayName ?? profile.username,
    }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// POST /api/signup
game.post('/signup', async (c) => {
  try {
    const body: SignupRequest = await c.req.json().catch(() => ({}));
    const profile = await getPlayerProfile();
    const cleanDisplayName = gameEngine.sanitizeAnswerText(body.displayName ?? profile.username).slice(0, 32) || profile.username;
    profile.preferences = {
      ...profile.preferences,
      onboarded: true,
      displayName: cleanDisplayName,
    };
    profile.lastActiveAt = new Date().toISOString();
    await redisStorage.savePlayerProfile(profile);

    return c.json<ApiSuccessResponse<{ profile: PlayerProfile; registered: true; displayName: string }>>(respondOk({
      profile,
      registered: true,
      displayName: cleanDisplayName,
    }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// GET /api/stats
game.get('/stats', async (c) => {
  try {
    const { question, state } = await ensureActiveQuestion();
    const profile = await getPlayerProfile();
    const answers = await redisStorage.getAnswersByQuestion(question.id);
    const votesRaw = await redisStorage.getVotesByQuestion(question.id);
    const votes = Object.values(votesRaw).map((value) => JSON.parse(value) as Vote);
    const leaderboard = await redisStorage.getLeaderboard();
    const totalScore = leaderboard.reduce((sum, entry) => sum + entry.score, 0);
    const averageScore = leaderboard.length === 0 ? 0 : Math.round(totalScore / leaderboard.length);
    const correctVotes = votes.filter((vote) => vote.isCorrect).length;
    const communityAccuracy = votes.length === 0 ? 0 : Math.round((correctVotes / votes.length) * 100);
    const stats: GameStats = {
      activeDate: state.activeDate,
      promptText: question.text,
      aiStyleName: gameEngine.getMonthlyAIStyle(question.date).name,
      aiStyleClue: gameEngine.getAIStyleClue(question.date),
      weeklyTheme: gameEngine.getWeeklyTheme(question.date),
      totalAnswersToday: answers.length,
      totalVotesToday: votes.length,
      communityAccuracy,
      registeredPlayers: leaderboard.length,
      averageScore,
      currentStreak: profile.streak.current,
      totalScore: profile.totalScore,
      levelProgress: gameEngine.buildLevelProgress(profile.totalScore),
      daysRegistered: state.questionIds.length,
    };

    return c.json<ApiSuccessResponse<{ stats: GameStats }>>(respondOk({ stats }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// GET /api/question
game.get('/question', async (c) => {
  try {
    const { question } = await ensureActiveQuestion();
    const playerId = await getPlayerId();
    const answer = question ? await getPlayerAnswerForQuestion(question.id, playerId) : null;
    return c.json<ApiSuccessResponse<{ question: Question | null; phase: string; answer: Answer | null }>>(respondOk({ question, phase: question ? (isQuestionActive(question) ? 'answering' : 'voting') : 'closed', answer }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// POST /api/answer
game.post('/answer', async (c) => {
  try {
    const body = (await c.req.json()) as AnswerRequest;
    const question = await getActiveQuestion();
    if (!question) throw new Error('No active daily question.');
    if (body.questionId !== question.id) {
      throw new Error('This answer belongs to a different daily question. Refresh and try again.');
    }
    if (!isQuestionActive(question)) {
      throw new Error('Today’s answer window has closed.');
    }
    const cleanText = validateAnswerText(body.answerText);
    const moderation = await geminiService.moderateAnswer(question.text, cleanText);
    if (!moderation.allowed) {
      throw new Error(`Answer rejected: ${moderation.reason}`);
    }
    const player = await getPlayerProfile();
    const existingAnswer = await getPlayerAnswerForQuestion(question.id, player.playerId);
    if (existingAnswer) {
      throw new Error('You already answered today.');
    }

    const answer = gameEngine.buildAnswer(question.id, player.playerId, cleanText, 'human');
    await redisStorage.saveAnswer(answer);

    player.totalAnswers += 1;
    player.totalScore += XP_REWARDS.dailyAnswer;
    const streakAdvanced = updateDailyStreak(player, question.date);
    if (streakAdvanced && player.streak.current > 0 && player.streak.current % 3 === 0) {
      player.totalScore += XP_REWARDS.threeStreak;
    }
    player.lastActiveAt = new Date().toISOString();
    gameEngine.syncAchievements(player);
    await redisStorage.savePlayerProfile(player);

    return c.json<ApiSuccessResponse<{ answer: Answer; profile: PlayerProfile }>>(respondOk({ answer, profile: player }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// GET /api/investigation
game.get('/investigation', async (c) => {
  try {
    const question = await getInvestigationQuestion();
    if (!question) throw new Error('Tomorrow’s poll is not ready yet. Answer today, then come back after the day advances.');
    await ensureAIAnswerForQuestion(question);
    const playerId = await getPlayerId();
    const answers = await redisStorage.getAnswersByQuestion(question.id);
    const investigationAnswers: InvestigationAnswer[] = await Promise.all(answers.map(async (answer) => ({
      ...answer,
      isOwnAnswer: answer.authorId === playerId,
      authorDisplayName: await getAnswerAuthorDisplayName(answer, question),
    })));
    const playerVotes = await getPlayerVoteSummariesForQuestion(question.id);
    return c.json<ApiSuccessResponse<{ question: Question | null; answers: InvestigationAnswer[]; playerVotes: PlayerVoteSummary[] }>>(respondOk({ question, answers: investigationAnswers, playerVotes }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// POST /api/vote
game.post('/vote', async (c) => {
  try {
    const body = (await c.req.json()) as VoteRequest;
    const question = await redisStorage.getQuestion(body.questionId);
    if (!question) throw new Error('No active vote phase.');
    const investigationQuestion = await getInvestigationQuestion();
    if (!investigationQuestion || investigationQuestion.id !== question.id) {
      throw new Error('Voting is only open for yesterday’s question.');
    }

    const votes = await getPlayerVotesForQuestion(question.id);
    if (votes.some((vote) => {
      try {
        const parsed = JSON.parse(vote as string) as Vote;
        return parsed.answerId === body.answerId;
      } catch {
        return false;
      }
    })) {
      throw new Error('Duplicate vote detected for this answer.');
    }

    const answer = await redisStorage.getAnswer(body.answerId);
    if (!answer || answer.questionId !== question.id) throw new Error('Answer not found for this poll.');

    const voterId = await getPlayerId();
    if (answer.authorId === voterId) {
      throw new Error('You cannot investigate your own answer.');
    }

    const voteType = sanitizeVoteType(body.voteType);
    const correct = answer.authorType === voteType;
    const fooledByHumanAnswer = answer.authorType === 'human' && voteType === 'ai' && answer.authorId !== voterId;
    const reasoning = sanitizeReasoning(body.reasoning);
    const confidence = sanitizeConfidence(body.confidence);
    const reasoningReview = reasoning ? await geminiService.evaluateReasoning(question.text, answer.text, voteType, answer.authorType, reasoning) : null;
    const vote = gameEngine.buildVote(question.id, answer.id, voterId, voteType, correct, reasoning, confidence, reasoningReview?.useful === true);
    await redisStorage.saveVote(vote);

    answer.voteCount += 1;
    if (correct) answer.correctVoteCount += 1;
    await redisStorage.saveAnswer(answer);

    const player = await getPlayerProfile();
    let playerXp = 0;
    let streakBonusXp = 0;
    let hardReadBonusXp = 0;
    let perfectInvestigationBonusXp = 0;
    let reasoningBonusXp = 0;
    let confidencePenaltyXp = 0;
    player.totalVotes += 1;
    if (correct) player.correctVotes += 1;
    player.lastActiveAt = new Date().toISOString();
    const gameState = (await redisStorage.getGameState()) ?? gameEngine.initialGameState();
    const streakAdvanced = updateDailyStreak(player, gameState.activeDate);
    if (streakAdvanced && player.streak.current > 0 && player.streak.current % 3 === 0) {
      player.totalScore += XP_REWARDS.threeStreak;
      streakBonusXp = XP_REWARDS.threeStreak;
      playerXp += streakBonusXp;
    }
    if (correct) {
      player.totalScore += XP_REWARDS.correctVote;
      playerXp += XP_REWARDS.correctVote;
    }

    if (!correct && confidence === 'high') {
      const penalty = Math.min(XP_REWARDS.highConfidenceMissPenalty, player.totalScore);
      player.totalScore -= penalty;
      confidencePenaltyXp = penalty;
      playerXp -= penalty;
    }

    if (reasoningReview?.useful === true) {
      player.totalScore += XP_REWARDS.usefulReasoning;
      reasoningBonusXp = XP_REWARDS.usefulReasoning;
      playerXp += reasoningBonusXp;
    }

    const wrongVoteRate = answer.voteCount === 0 ? 0 : (answer.voteCount - answer.correctVoteCount) / answer.voteCount;
    if (correct && answer.voteCount >= 4 && wrongVoteRate >= 0.75) {
      player.totalScore += XP_REWARDS.hardRead;
      hardReadBonusXp = XP_REWARDS.hardRead;
      playerXp += hardReadBonusXp;
    }

    const allAnswers = await redisStorage.getAnswersByQuestion(question.id);
    const allVotesRaw = await redisStorage.getVotesByQuestion(question.id);
    const playerVotes = Object.values(allVotesRaw)
      .map((value) => JSON.parse(value) as Vote)
      .filter((item) => item.voterId === voterId);
    const votedAnswerIds = new Set(playerVotes.map((item) => item.answerId));
    const votableAnswers = allAnswers.filter((item) => item.authorId !== voterId);
    const completedInvestigation = votableAnswers.length > 0 && votableAnswers.every((item) => votedAnswerIds.has(item.id));
    const perfectInvestigation = completedInvestigation && playerVotes.every((item) => item.isCorrect);
    if (perfectInvestigation) {
      perfectInvestigationBonusXp = grantAchievementXp(player, `perfect-investigation:${question.id}`, XP_REWARDS.perfectInvestigation);
      playerXp += perfectInvestigationBonusXp;
    }
    gameEngine.syncAchievements(player);
    await redisStorage.savePlayerProfile(player);

    let authorBonusXp = 0;
    if (fooledByHumanAnswer) {
      const author = await redisStorage.getPlayerProfile(answer.authorId);
      if (author) {
        author.totalScore += XP_REWARDS.mimicBonus;
        author.lastActiveAt = new Date().toISOString();
        gameEngine.syncAchievements(author);
        await redisStorage.savePlayerProfile(author);
        authorBonusXp = XP_REWARDS.mimicBonus;
      }
    }

    return c.json<ApiSuccessResponse<{ vote: { id: string; correct: boolean; playerXp: number; authorBonusXp: number; streakBonusXp: number; hardReadBonusXp: number; perfectInvestigationBonusXp: number; reasoningBonusXp: number; confidencePenaltyXp: number; currentStreak: number } }>>(respondOk({
      vote: {
        id: vote.id,
        correct,
        playerXp,
        authorBonusXp,
        streakBonusXp,
        hardReadBonusXp,
        perfectInvestigationBonusXp,
        reasoningBonusXp,
        confidencePenaltyXp,
        currentStreak: player.streak.current,
      },
    }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// GET /api/results
game.get('/results', async (c) => {
  try {
    const question = await getInvestigationQuestion();
    if (!question) {
      return c.json<ApiSuccessResponse<{ question: Question | null; answers: Answer[]; statistics: DailyStatistics | null; registered: false }>>(respondOk({ question: null, answers: [], statistics: null, registered: false }));
    }

    await ensureAIAnswerForQuestion(question);
    const answers = await redisStorage.getAnswersByQuestion(question.id);
    const votesRaw = await redisStorage.getVotesByQuestion(question.id);
    const votes = Object.values(votesRaw).map((value) => JSON.parse(value) as Vote);
    const statistics = gameEngine.buildDailyStatistics(question.id, answers, votes, question.date);
    const insights = buildResultsInsight(answers, votes, statistics.overallAccuracy);
    await redisStorage.saveDailyStatistics(statistics);
    return c.json<ApiSuccessResponse<{ question: Question | null; answers: Answer[]; statistics: DailyStatistics; insights: ResultsInsight; registered: true }>>(respondOk({ question, answers, statistics, insights, registered: true }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// GET /api/profile
game.get('/profile', async (c) => {
  try {
    const player = await getPlayerProfile();
    const achievements = gameEngine.syncAchievements(player);
    const levelProgress = gameEngine.buildLevelProgress(player.totalScore);
    const preferences = getPreferences(player);
    await redisStorage.savePlayerProfile(player);
    return c.json<ApiSuccessResponse<{ profile: PlayerProfile; levelProgress: LevelProgress; achievements: AchievementDisplay[]; pinnedAchievementIds: string[] }>>(respondOk({
      profile: player,
      levelProgress,
      achievements,
      pinnedAchievementIds: preferences.pinnedAchievementIds ?? [],
    }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// POST /api/profile/pins
game.post('/profile/pins', async (c) => {
  try {
    const body = (await c.req.json()) as PinAchievementsRequest;
    const player = await getPlayerProfile();
    const achievements = gameEngine.syncAchievements(player);
    const unlockedIds = new Set(achievements.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id));
    const requested = (body.achievementIds ?? []).filter((id, index, list) => list.indexOf(id) === index && unlockedIds.has(id)).slice(0, 3);
    player.preferences = {
      ...player.preferences,
      pinnedAchievementIds: requested,
    };
    await redisStorage.savePlayerProfile(player);
    return c.json<ApiSuccessResponse<{ pinnedAchievementIds: string[] }>>(respondOk({ pinnedAchievementIds: requested }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// GET /api/leaderboard
game.get('/leaderboard', async (c) => {
  try {
    await ensureBotLeaderboardProfiles();
    const leaderboard = await redisStorage.getLeaderboard();
    const entries = await Promise.all(leaderboard.map(async (entry): Promise<LeaderboardEntryWithLevel> => {
      const profile = await redisStorage.getPlayerProfile(entry.playerId);
      const level = gameEngine.buildLevelProgress(profile?.totalScore ?? entry.score).level;
      const rank = gameEngine.getLevelRank(level);
      return {
        ...entry,
        level,
        ...rank,
      };
    }));
    return c.json<ApiSuccessResponse<{ entries: LeaderboardEntryWithLevel[] }>>(respondOk({ entries }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});

// GET /api/history
game.get('/history', async (c) => {
  try {
    const playerId = await getPlayerId();
    const gameState = (await redisStorage.getGameState()) ?? gameEngine.initialGameState();
    const historyItems = await Promise.all(gameState.questionIds.map(async (questionId): Promise<VoteHistoryItem[]> => {
      const question = await redisStorage.getQuestion(questionId);
      if (!question) return [];

      const votesRaw = await redisStorage.getVotesByQuestion(question.id);
      const playerVotes = Object.values(votesRaw).flatMap((value) => {
        try {
          const parsed = JSON.parse(value) as Vote;
          return parsed.voterId === playerId ? [parsed] : [];
        } catch {
          return [];
        }
      });

      const items = await Promise.all(playerVotes.map(async (vote): Promise<VoteHistoryItem | null> => {
        const answer = await redisStorage.getAnswer(vote.answerId);
        if (!answer) return null;

        return {
          questionId: question.id,
          questionText: question.text,
          questionDate: question.date,
          answerId: answer.id,
          answerText: answer.text,
          selected: vote.voteType,
          actual: answer.authorType,
          correct: vote.isCorrect,
          submittedAt: vote.submittedAt,
        };
      }));

      return items.filter((item): item is VoteHistoryItem => item !== null);
    }));

    const items = historyItems.flat().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return c.json<ApiSuccessResponse<{ items: VoteHistoryItem[] }>>(respondOk({ items }));
  } catch (error) {
    return c.json<ApiErrorResponse>(respondError((error as Error).message), 400);
  }
});
