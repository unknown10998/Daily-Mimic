import type {
  AchievementDisplay,
  AIEvolutionLesson,
  Answer,
  DailyStatistics,
  LeaderboardEntry,
  LevelProgress,
  PlayerProfile,
  Question,
} from './game';

export type ApiErrorResponse = {
  status: 'error';
  message: string;
};

export type ApiSuccessResponse<T> = {
  status: 'ok';
  data: T;
};

export interface QuestionResponse {
  question: Question | null;
  phase: 'answering' | 'voting' | 'results' | 'closed';
}

export interface AnswerRequest {
  questionId: string;
  answerText: string;
}

export interface AnswerResponse {
  answer: Answer;
}

export interface InvestigationResponse {
  question: Question | null;
  answers: Answer[];
}

export interface VoteRequest {
  questionId: string;
  answerId: string;
  voteType: 'human' | 'ai' | 'hybrid';
  confidence?: 'low' | 'medium' | 'high';
  reasoning?: string;
}

export interface VoteResponse {
  correct: boolean;
  answerId: string;
  questionId: string;
}

export interface ResultsResponse {
  question: Question | null;
  statistics: DailyStatistics | null;
  answers: Answer[];
}

export interface ProfileResponse {
  profile: PlayerProfile;
  levelProgress: LevelProgress;
  achievements: AchievementDisplay[];
  pinnedAchievementIds: string[];
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

export interface GenerateAIRequest {
  questionId: string;
}

export interface GenerateAIResponse {
  answerId: string;
  answerText: string;
}

export interface RolloverResponse {
  message: string;
  lesson?: AIEvolutionLesson;
}
