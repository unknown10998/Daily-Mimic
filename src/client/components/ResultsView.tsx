import { useEffect, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { Skeleton } from './ui/Skeleton';
import { formatDisplayDate } from '../utils/date';

type DailyStatistics = {
  date: string;
  totalAnswers: number;
  totalVotes: number;
  overallAccuracy: number;
};

type ResultsPayload = {
  status: 'ok';
  data: {
    registered: boolean;
    statistics: DailyStatistics | null;
    insights?: {
      difficulty: string;
      communityClues: string[];
      heatmap: {
        human: string[];
        ai: string[];
        hybrid: string[];
      };
    };
    answers: { id: string; text: string; authorType: 'human' | 'ai' | 'hybrid'; voteCount: number; correctVoteCount: number }[];
    question: { text: string; date: string } | null;
  };
};

const previewText = (text: string): string => (text.length > 180 ? `${text.slice(0, 180).trim()}...` : text);
const authorTypeLabel = (value: ResultsPayload['data']['answers'][number]['authorType']): string => {
  if (value === 'ai') return 'AI';
  if (value === 'human') return 'Human';
  return 'Hybrid';
};

export const ResultsView = () => {
  const [payload, setPayload] = useState<ResultsPayload['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch('/api/results');
        const result = (await response.json()) as ResultsPayload;

        if (!response.ok || result.status !== 'ok') {
          showToast('Results are not ready yet.');
          return;
        }

        setPayload(result.data);
      } catch (error) {
        console.error(error);
        showToast('Unable to load results.');
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, []);

  if (loading) {
    return <Skeleton className="h-[520px] w-full rounded-lg" />;
  }

  if (!payload?.registered) {
    return (
      <Card className="space-y-5 bg-[#fbfcf8]" data-tour-target="results-card">
        <p className="text-xs font-black uppercase text-[#ef5b4f]">Results</p>
        <h2 className="text-4xl font-black leading-tight text-[#101418]">No finished poll yet</h2>
        <p className="max-w-2xl text-sm font-semibold leading-6 text-[#303943]">
          Results show yesterday's poll outcome. This looks like the first active day, so there is not a completed daily cycle to score yet.
        </p>
        <div className="grid max-w-sm grid-cols-5 gap-2">
          {'WAIT'.split('').map((letter, index) => (
            <span key={`${letter}-${index}`} className="grid aspect-square place-items-center rounded-sm border-2 border-[#101418] bg-white text-xl font-black text-[#66707a]">
              {letter}
            </span>
          ))}
        </div>
      </Card>
    );
  }

  const stats = payload.statistics;
  const accuracy = Math.round((stats?.overallAccuracy ?? 0) * 100);
  const questionDate = payload.question?.date ?? stats?.date;
  const displayQuestionDate = formatDisplayDate(questionDate);

  return (
    <section className="space-y-6">
      <Card className="space-y-4 bg-[#fbfcf8]" data-tour-target="results-card">
        <p className="text-xs font-black uppercase text-[#ef5b4f]">Yesterday's poll {displayQuestionDate ? `- ${displayQuestionDate}` : ''}</p>
        <h2 className="text-4xl font-black leading-tight text-[#101418]">Poll outcome</h2>
        <p className="text-sm font-semibold leading-6 text-[#303943]">{payload.question?.text}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4">
          <p className="text-xs font-black uppercase text-[#66707a]">Accuracy</p>
          <p className="text-4xl font-black text-[#00a7a5]">{accuracy}%</p>
          <ProgressBar progress={accuracy} label="Correct votes" />
        </Card>

        <Card className="space-y-4">
          <p className="text-xs font-black uppercase text-[#66707a]">Answers</p>
          <p className="text-4xl font-black text-[#ef5b4f]">{stats?.totalAnswers ?? 0}</p>
          <p className="text-sm font-semibold text-[#303943]">Registered answer cards.</p>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs font-black uppercase text-[#66707a]">Votes</p>
          <p className="text-4xl font-black text-[#c6a448]">{stats?.totalVotes ?? 0}</p>
          <p className="text-sm font-semibold text-[#303943]">Classifications submitted.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3">
          <p className="text-xs font-black uppercase text-[#66707a]">Daily difficulty</p>
          <p className="text-3xl font-black text-[#101418]">{payload.insights?.difficulty ?? 'Unrated'}</p>
          <p className="text-sm font-semibold text-[#303943]">Based on how many voters got yesterday right.</p>
        </Card>
        <Card className="space-y-3 lg:col-span-2">
          <p className="text-xs font-black uppercase text-[#66707a]">Community clues</p>
          {(payload.insights?.communityClues.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {payload.insights?.communityClues.map((clue, index) => (
                <p key={`${clue}-${index}`} className="rounded-sm border-2 border-[#101418] bg-white px-3 py-2 text-sm font-semibold text-[#303943]">{clue}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-[#303943]">No reasoning clues were submitted for this poll.</p>
          )}
        </Card>
      </div>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase text-[#66707a]">Humanity heatmap</p>
          <p className="mt-1 text-sm font-semibold text-[#303943]">Signal words come from player reasoning first, then from the answer text when clues are still sparse.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-black uppercase text-[#ef5b4f]">Human signals</p>
            <div className="mt-2 flex min-h-10 flex-wrap gap-2">
              {(payload.insights?.heatmap.human ?? []).length > 0 ? (payload.insights?.heatmap.human ?? []).map((word) => <Badge key={word} tone="warm">{word}</Badge>) : <span className="text-sm font-semibold text-[#66707a]">Waiting for signals</span>}
            </div>
          </div>
          <div>
            <p className="text-sm font-black uppercase text-[#00a7a5]">AI signals</p>
            <div className="mt-2 flex min-h-10 flex-wrap gap-2">
              {(payload.insights?.heatmap.ai ?? []).length > 0 ? (payload.insights?.heatmap.ai ?? []).map((word) => <Badge key={word} tone="soft">{word}</Badge>) : <span className="text-sm font-semibold text-[#66707a]">Waiting for signals</span>}
            </div>
          </div>
          <div>
            <p className="text-sm font-black uppercase text-[#c6a448]">Hybrid signals</p>
            <div className="mt-2 flex min-h-10 flex-wrap gap-2">
              {(payload.insights?.heatmap.hybrid ?? []).length > 0 ? (payload.insights?.heatmap.hybrid ?? []).map((word) => <Badge key={word} tone="warm">{word}</Badge>) : <span className="text-sm font-semibold text-[#66707a]">Waiting for signals</span>}
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-xs font-black uppercase text-[#66707a]">Answer breakdown</p>
        <div className="space-y-3">
          {payload.answers.map((answer) => (
            <div key={answer.id} className="space-y-3 rounded-sm border-2 border-[#101418] bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={answer.authorType === 'human' ? 'warm' : 'soft'}>{authorTypeLabel(answer.authorType)}</Badge>
                <span className="text-xs font-black uppercase text-[#66707a]">
                  {answer.correctVoteCount}/{answer.voteCount} correct votes
                </span>
              </div>
              <p className="text-sm font-semibold leading-6 text-[#303943]">{previewText(answer.text)}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
};
