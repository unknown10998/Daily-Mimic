import { redis } from '@devvit/web/server';
import type {
  AIEvolution,
  Answer,
  AnsweredQuestionHistory,
  AnsweredQuestionRecord,
  DailyStatistics,
  GameState,
  LeaderboardEntry,
  PlayerProfile,
  Question,
  Vote,
} from '../types/game';

const serialize = <T>(value: T): string => JSON.stringify(value);

const deserialize = <T>(value: string | null | undefined): T | null => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const redisKeys = {
  activeQuestion: (date: string) => `mimic:activeQuestion:${date}`,
  question: (id: string) => `mimic:question:${id}`,
  answer: (id: string) => `mimic:answer:${id}`,
  answersByQuestion: (questionId: string) => `mimic:answers:${questionId}`,
  votesByQuestion: (questionId: string) => `mimic:votes:${questionId}`,
  playerProfile: (playerId: string) => `mimic:player:${playerId}`,
  leaderboard: 'mimic:leaderboard',
  gameState: 'mimic:gameState',
  dailyStatistics: (questionId: string) => `mimic:stats:${questionId}`,
  aiEvolution: 'mimic:aiEvolution',
  answeredQuestions: (year: string) => `mimic:answeredQuestions:${year}`,
};

export const redisStorage = {
  getQuestion: async (questionId: string): Promise<Question | null> => {
    return deserialize<Question>(await redis.get(redisKeys.question(questionId)));
  },

  saveQuestion: async (question: Question): Promise<void> => {
    await redis.set(redisKeys.question(question.id), serialize(question));
  },

  getQuestionByDate: async (date: string): Promise<Question | null> => {
    const questionId = await redis.get(redisKeys.activeQuestion(date));
    if (!questionId) return null;
    return redisStorage.getQuestion(questionId);
  },

  setActiveQuestion: async (date: string, questionId: string): Promise<void> => {
    await redis.set(redisKeys.activeQuestion(date), questionId);
  },

  getAnswerIdsByQuestion: async (questionId: string): Promise<string[]> => {
    const payload = await redis.get(redisKeys.answersByQuestion(questionId));
    if (!payload) return [];
    try {
      return JSON.parse(payload) as string[];
    } catch {
      return [];
    }
  },

  saveAnswer: async (answer: Answer): Promise<void> => {
    await redis.set(redisKeys.answer(answer.id), serialize(answer));
    const ids = await redisStorage.getAnswerIdsByQuestion(answer.questionId);
    if (!ids.includes(answer.id)) {
      ids.push(answer.id);
      await redis.set(redisKeys.answersByQuestion(answer.questionId), serialize(ids));
    }
  },

  getAnswersByQuestion: async (questionId: string): Promise<Answer[]> => {
    const ids = await redisStorage.getAnswerIdsByQuestion(questionId);
    const answers = await Promise.all(ids.map((id) => redisStorage.getAnswer(id)));
    return answers.filter((item): item is Answer => item !== null);
  },

  getAnswer: async (answerId: string): Promise<Answer | null> => {
    return deserialize<Answer>(await redis.get(redisKeys.answer(answerId)));
  },

  saveVote: async (vote: Vote): Promise<void> => {
    await redis.hSet(redisKeys.votesByQuestion(vote.questionId), { [vote.id]: serialize(vote) });
  },

  getVotesByQuestion: async (questionId: string): Promise<Record<string, string>> => {
    const votes = await redis.hGetAll(redisKeys.votesByQuestion(questionId));
    return votes ?? {};
  },

  getPlayerProfile: async (playerId: string): Promise<PlayerProfile | null> => {
    return deserialize<PlayerProfile>(await redis.get(redisKeys.playerProfile(playerId)));
  },

  savePlayerProfile: async (profile: PlayerProfile): Promise<void> => {
    await redis.set(redisKeys.playerProfile(profile.playerId), serialize(profile));
    const leaderboard = await redisStorage.getLeaderboard();
    const nextEntry: LeaderboardEntry = {
      playerId: profile.playerId,
      username: profile.username,
      rank: 0,
      score: profile.totalScore,
      currentStreak: profile.streak.current,
      lastActiveAt: profile.lastActiveAt,
    };
    const nextLeaderboard = [
      ...leaderboard.filter((entry) => entry.playerId !== profile.playerId),
      nextEntry,
    ]
      .sort((a, b) => b.score - a.score || b.currentStreak - a.currentStreak || a.username.localeCompare(b.username))
      .slice(0, 50)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    await redisStorage.saveLeaderboard(nextLeaderboard);
  },

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const content = deserialize<LeaderboardEntry[]>(await redis.get(redisKeys.leaderboard));
    return content ?? [];
  },

  saveLeaderboard: async (entries: LeaderboardEntry[]): Promise<void> => {
    await redis.set(redisKeys.leaderboard, serialize(entries));
  },

  getGameState: async (): Promise<GameState | null> => {
    return deserialize<GameState>(await redis.get(redisKeys.gameState));
  },

  saveGameState: async (state: GameState): Promise<void> => {
    await redis.set(redisKeys.gameState, serialize(state));
  },

  getDailyStatistics: async (questionId: string): Promise<DailyStatistics | null> => {
    return deserialize<DailyStatistics>(await redis.get(redisKeys.dailyStatistics(questionId)));
  },

  saveDailyStatistics: async (stats: DailyStatistics): Promise<void> => {
    await redis.set(redisKeys.dailyStatistics(stats.questionId), serialize(stats));
  },

  getAIEvolution: async (): Promise<AIEvolution | null> => {
    return deserialize<AIEvolution>(await redis.get(redisKeys.aiEvolution));
  },

  saveAIEvolution: async (evolution: AIEvolution): Promise<void> => {
    await redis.set(redisKeys.aiEvolution, serialize(evolution));
  },

  getAnsweredQuestionHistory: async (year: string): Promise<AnsweredQuestionHistory> => {
    const history = deserialize<AnsweredQuestionHistory>(await redis.get(redisKeys.answeredQuestions(year)));
    const now = new Date().toISOString();
    return history ?? {
      year,
      questions: [],
      lastResetAt: now,
      lastUpdatedAt: now,
    };
  },

  saveAnsweredQuestionHistory: async (history: AnsweredQuestionHistory): Promise<void> => {
    await redis.set(redisKeys.answeredQuestions(history.year), serialize(history));
  },

  addAnsweredQuestionRecord: async (record: AnsweredQuestionRecord): Promise<void> => {
    const year = record.date.slice(0, 4);
    const history = await redisStorage.getAnsweredQuestionHistory(year);
    const nextHistory: AnsweredQuestionHistory = {
      ...history,
      questions: [
        ...history.questions.filter((item) => item.questionId !== record.questionId),
        record,
      ].slice(-366),
      lastUpdatedAt: new Date().toISOString(),
    };
    await redisStorage.saveAnsweredQuestionHistory(nextHistory);
  },
};
