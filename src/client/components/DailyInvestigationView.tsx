import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Button } from './ui/Button';
import { ResponseCard } from './ui/ResponseCard';
import { Skeleton } from './ui/Skeleton';
import type { ConfidenceOption, ResponseOption } from './ui/ResponseCard';
import { formatDisplayDate } from '../utils/date';

type Answer = {
  id: string;
  text: string;
  authorType: 'human' | 'ai' | 'hybrid';
  isOwnAnswer?: boolean;
};

type PlayerVote = {
  answerId: string;
  voteType: 'human' | 'ai' | 'hybrid';
  correct: boolean;
};

type InvestigationPayload = {
  status: 'ok';
  data: {
    answers: Answer[];
    playerVotes: PlayerVote[];
    question: {
      id: string;
      text: string;
      date: string;
    } | null;
  };
};

type VotePayload = {
  status: 'ok';
  data: {
    vote: {
      id: string;
      correct: boolean;
      playerXp: number;
      authorBonusXp: number;
      streakBonusXp: number;
      hardReadBonusXp: number;
      perfectInvestigationBonusXp: number;
      reasoningBonusXp: number;
      confidencePenaltyXp: number;
    };
  };
};

type ApiErrorPayload = {
  status: 'error';
  message: string;
};

type SubmitSummary = {
  correctVotes: number;
  totalVotes: number;
  playerXp: number;
  authorBonusXp: number;
  streakBonusXp: number;
  hardReadBonusXp: number;
  perfectInvestigationBonusXp: number;
  reasoningBonusXp: number;
  confidencePenaltyXp: number;
};

const toVoteType = (option: ResponseOption) => option.toLowerCase();
const toResponseOption = (value: PlayerVote['voteType'] | Answer['authorType']): ResponseOption => {
  if (value === 'ai') return 'AI';
  if (value === 'human') return 'Human';
  return 'Hybrid';
};

export const DailyInvestigationView = () => {
  const [responses, setResponses] = useState<Answer[]>([]);
  const [questionId, setQuestionId] = useState('');
  const [questionDate, setQuestionDate] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState<Record<string, ResponseOption | null>>({});
  const [reasonings, setReasonings] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, ConfidenceOption>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitSummary, setSubmitSummary] = useState<SubmitSummary | null>(null);

  useEffect(() => {
    const loadInvestigation = async () => {
      try {
        const response = await fetch('/api/investigation');
        const result = (await response.json()) as InvestigationPayload | ApiErrorPayload;

        if (!response.ok || result.status !== 'ok') {
          showToast(result.status === 'error' ? result.message : 'Investigation is not available yet.');
          return;
        }

        setResponses(result.data.answers);
        setQuestionId(result.data.question?.id ?? '');
        setQuestionDate(result.data.question?.date ?? '');
        setQuestionText(result.data.question?.text ?? '');
        const savedVotes = Object.fromEntries(result.data.playerVotes.map((vote) => [vote.answerId, toResponseOption(vote.voteType)]));
        setAnswers(Object.fromEntries(result.data.answers.map((item) => [item.id, savedVotes[item.id] ?? null])));
        setReasonings(Object.fromEntries(result.data.answers.map((item) => [item.id, ''])));
        setConfidences(Object.fromEntries(result.data.answers.map((item) => [item.id, 'medium'])));
        setSubmitted(result.data.playerVotes.length > 0);
      } catch (error) {
        console.error(error);
        showToast('Unable to load investigation.');
      } finally {
        setLoading(false);
      }
    };

    void loadInvestigation();
  }, []);

  const votableResponses = useMemo(() => responses.filter((response) => response.isOwnAnswer !== true), [responses]);
  const completed = useMemo(() => votableResponses.filter((response) => answers[response.id]).length, [answers, votableResponses]);

  const handleSelect = (id: string, type: ResponseOption) => {
    setAnswers((prev) => ({ ...prev, [id]: prev[id] === type ? null : type }));
  };

  const handleReasoningChange = (id: string, value: string) => {
    setReasonings((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfidenceChange = (id: string, value: ConfidenceOption) => {
    setConfidences((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!questionId) return;
    setSubmitting(true);
    let correctVotes = 0;
    let totalVotes = 0;
    let playerXp = 0;
    let authorBonusXp = 0;
    let streakBonusXp = 0;
    let hardReadBonusXp = 0;
    let perfectInvestigationBonusXp = 0;
    let reasoningBonusXp = 0;
    let confidencePenaltyXp = 0;

    try {
      for (const response of responses) {
        if (response.isOwnAnswer) continue;
        const vote = answers[response.id];
        if (!vote) continue;

        const apiResponse = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId, answerId: response.id, voteType: toVoteType(vote), reasoning: reasonings[response.id] ?? '', confidence: confidences[response.id] ?? 'medium' }),
        });
        const result = (await apiResponse.json()) as VotePayload | ApiErrorPayload;

        if (!apiResponse.ok || result.status !== 'ok') {
          showToast(result.status === 'error' ? result.message : 'One vote could not be saved.');
          return;
        }

        totalVotes += 1;
        if (result.data.vote.correct) correctVotes += 1;
        playerXp += result.data.vote.playerXp;
        authorBonusXp += result.data.vote.authorBonusXp;
        streakBonusXp += result.data.vote.streakBonusXp;
        hardReadBonusXp += result.data.vote.hardReadBonusXp;
        perfectInvestigationBonusXp += result.data.vote.perfectInvestigationBonusXp;
        reasoningBonusXp += result.data.vote.reasoningBonusXp;
        confidencePenaltyXp += result.data.vote.confidencePenaltyXp;
      }

      setSubmitted(true);
      setSubmitSummary({ correctVotes, totalVotes, playerXp, authorBonusXp, streakBonusXp, hardReadBonusXp, perfectInvestigationBonusXp, reasoningBonusXp, confidencePenaltyXp });
      showToast('Investigation saved. Results revealed below.');
    } catch (error) {
      console.error(error);
      showToast('Unable to submit investigation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-[520px] w-full rounded-lg" />;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-6 shadow-[6px_6px_0_#101418]" data-tour-target="investigation-card">
        <p className="text-xs font-black uppercase text-[#ef5b4f]">Yesterday’s poll {questionDate ? `· ${formatDisplayDate(questionDate)}` : ''}</p>
        <h2 className="mt-3 text-3xl font-black text-[#101418]">Find Mimic in yesterday’s answers.</h2>
        {questionText ? <p className="mt-3 text-sm font-semibold leading-6 text-[#303943]">{questionText}</p> : null}
        <p className="mt-3 text-sm font-semibold leading-6 text-[#303943]">
          Vote on other players only. If your answer appears here, it is locked and skipped so the round stays fair.
        </p>
        <div className="mt-4 inline-flex items-center gap-4 rounded-sm border-2 border-[#101418] bg-[#dff6f4] px-4 py-3 text-sm text-[#101418]">
          <span className="font-black">Progress</span>
          <span className="font-mono font-bold">{completed}/{votableResponses.length} solved</span>
        </div>
      </div>

      {submitted ? (
        <div className="rounded-sm border-2 border-[#101418] bg-[#fff9df] p-6 shadow-[5px_5px_0_#101418]">
          <p className="font-black text-[#101418]">Your choices are saved.</p>
          <p className="mt-2 text-sm font-semibold text-[#303943]">The real labels are revealed in the highlighted boxes below. History keeps the permanent record.</p>
        </div>
      ) : null}

      {submitSummary ? (
        <div className="mimic-popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#101418]/70 px-4 py-8 backdrop-blur-sm">
          <div className="mimic-popup-card mimic-popup-content w-full max-w-2xl rounded-sm border-4 border-[#101418] bg-white p-7 shadow-[10px_10px_0_#101418]">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase text-[#ef5b4f]">Investigation results</p>
                <h3 className="mt-2 text-4xl font-black text-[#101418]">
                  {submitSummary.correctVotes}/{submitSummary.totalVotes} correct
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#303943]">
                  Actual labels are now visible. You earned {submitSummary.playerXp} XP from this investigation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitSummary(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border-2 border-[#101418] bg-[#ef5b4f] text-lg font-black text-white shadow-[3px_3px_0_#101418]"
                aria-label="Close results popup"
              >
                x
              </button>
            </div>
            <div className="mt-5 grid gap-2 text-sm font-black text-[#101418] sm:grid-cols-2">
              {submitSummary.perfectInvestigationBonusXp > 0 ? <p className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] px-3 py-2">Perfect investigation bonus: +{submitSummary.perfectInvestigationBonusXp} XP</p> : null}
              {submitSummary.hardReadBonusXp > 0 ? <p className="rounded-sm border-2 border-[#101418] bg-[#fff9df] px-3 py-2">Hard read bonus: +{submitSummary.hardReadBonusXp} XP</p> : null}
              {submitSummary.streakBonusXp > 0 ? <p className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] px-3 py-2">Streak bonus: +{submitSummary.streakBonusXp} XP</p> : null}
              {submitSummary.reasoningBonusXp > 0 ? <p className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] px-3 py-2">Reasoning bonus: +{submitSummary.reasoningBonusXp} XP</p> : null}
              {submitSummary.confidencePenaltyXp > 0 ? <p className="rounded-sm border-2 border-[#101418] bg-[#fff9df] px-3 py-2">High confidence miss: -{submitSummary.confidencePenaltyXp} XP</p> : null}
            </div>
            {submitSummary.authorBonusXp > 0 ? (
              <p className="mt-4 rounded-sm border-2 border-[#101418] bg-[#dff6f4] px-3 py-2 text-sm font-black text-[#101418]">
                You triggered {submitSummary.authorBonusXp} XP of mimic bonuses for other players.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {responses.length === 0 ? (
        <div className="rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-6 font-semibold text-[#303943] shadow-[5px_5px_0_#101418]">
          No answers are ready for yesterday’s poll yet. Answer today, then advance the day to investigate those responses.
        </div>
      ) : (
        <div className="grid gap-4">
          {responses.map((response) => (
            <ResponseCard
              key={response.id}
              text={response.text}
              selected={answers[response.id]}
              actual={toResponseOption(response.authorType)}
              reveal={submitted}
              reasoning={reasonings[response.id] ?? ''}
              confidence={confidences[response.id] ?? 'medium'}
              disabled={response.isOwnAnswer === true}
              disabledReason="You wrote this one, so it is skipped for your investigation."
              onReasoningChange={(value) => handleReasoningChange(response.id, value)}
              onConfidenceChange={(value) => handleConfidenceChange(response.id, value)}
              onSelect={(choice) => handleSelect(response.id, choice)}
            />
          ))}
        </div>
      )}

      <Button disabled={submitted || votableResponses.length === 0 || completed < votableResponses.length} loading={submitting} className="w-full" onClick={handleSubmit}>
        Finish investigation
      </Button>
    </section>
  );
};
