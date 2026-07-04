export type AuthorType = 'human' | 'ai' | 'hybrid';

export interface Question {
  id: string;
  text: string;
  date: string; // ISO date for the daily cycle
  createdAt: string;
  activeFrom: string;
  activeUntil: string;
  isPublished: boolean;
  generatedByAIEvolution?: boolean;
  sourceHint?: string;
}

export interface Answer {
  id: string;
  questionId: string;
  authorId: string;
  authorType: AuthorType;
  text: string;
  submittedAt: string;
  source?: string; // 'user' | 'gemini' | 'hybrid'
  markers: {
    length: number;
    hasUrls: boolean;
    hasPersonalDetail: boolean;
  };
  voteCount: number;
  correctVoteCount: number;
  isVisible: boolean;
}

export interface Vote {
  id: string;
  questionId: string;
  answerId: string;
  voterId: string;
  voteType: AuthorType;
  confidence?: 'low' | 'medium' | 'high';
  reasoning?: string;
  reasoningUseful?: boolean;
  submittedAt: string;
  isCorrect: boolean;
}

export interface PlayerProfile {
  playerId: string;
  username: string;
  createdAt: string;
  lastActiveAt: string;
  totalScore: number;
  totalVotes: number;
  correctVotes: number;
  totalAnswers: number;
  streak: Streak;
  achievements: string[];
  preferences?: Record<string, unknown>;
}

export interface Streak {
  current: number;
  best: number;
  lastSuccessAt?: string;
}

export type LevelProgress = {
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelRequirement: number;
  progressPercent: number;
};

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  hint?: string;
  xpReward: number;
  secret?: boolean;
};

export type AchievementDisplay = AchievementDefinition & {
  unlocked: boolean;
};

export interface DailyStatistics {
  questionId: string;
  date: string;
  totalAnswers: number;
  totalVotes: number;
  overallAccuracy: number;
  humanDetectionRate: number;
  aiDetectionRate: number;
  hybridDetectionRate: number;
  mostBelievableHumanAnswerId?: string;
  mostObviousAIAnswerId?: string;
  votersWithPerfectScore: number;
  topPlayerIds: string[];
}

export interface AIEvolutionLesson {
  date: string;
  questionId: string;
  observations: string[];
  mistakesToAvoid: string[];
  humanPatterns: string[];
  aiPatterns: string[];
  nextPromptGuidance: string;
  generatedAt: string;
}

export interface AIEvolution {
  history: AIEvolutionLesson[];
  lastUpdatedAt: string;
}

export type AnsweredQuestionRecord = {
  questionId: string;
  date: string;
  text: string;
  humanAnswerCount: number;
  aiAnswerCount: number;
  voteCount: number;
  humanPatterns: string[];
  aiStyleName: string;
  recordedAt: string;
};

export type AnsweredQuestionHistory = {
  year: string;
  questions: AnsweredQuestionRecord[];
  lastResetAt: string;
  lastUpdatedAt: string;
};

export type AIStyle = {
  id: string;
  name: string;
  month: string;
  answerGuidance: string;
  questionGuidance: string;
};

export interface GameState {
  activeQuestionId?: string;
  phase: 'answering' | 'voting' | 'results' | 'closed';
  activeDate: string;
  nextRolloverAt: string;
  answerDeadlineAt: string;
  votingDeadlineAt: string;
  questionIds: string[];
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  rank: number;
  score: number;
  level?: number;
  levelRank?: string;
  adjective?: string;
  currentStreak: number;
  lastActiveAt: string;
}
