import { useEffect, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { StreakCelebrationPopup } from './Layout';
import { Skeleton } from './ui/Skeleton';
import { formatDisplayDate } from '../utils/date';

type Question = {
  id: string;
  text: string;
  date: string;
  sourceHint?: string;
};

type SubmittedAnswer = {
  id: string;
  text: string;
  submittedAt: string;
};

type QuestionPayload = {
  status: 'ok';
  data: {
    question: Question | null;
    phase: string;
    answer: SubmittedAnswer | null;
  };
};

type AnswerSubmitPayload = {
  status: 'ok';
  data: {
    answer: SubmittedAnswer;
    profile: {
      streak: {
        current: number;
      };
    };
  };
};

type ApiErrorPayload = {
  status: 'error';
  message: string;
};

type QuestionScreenProps = {
  refreshKey: number;
  onAnswered?: () => void;
};

const MIN_ANSWER_LENGTH = 250;
const MAX_ANSWER_LENGTH = 1000;

const tiles = [
  { letter: 'M', tone: 'bg-[#00a7a5]' },
  { letter: 'I', tone: 'bg-[#ef5b4f]' },
  { letter: 'M', tone: 'bg-[#c6a448]' },
  { letter: 'I', tone: 'bg-[#101418]' },
  { letter: 'C', tone: 'bg-[#00a7a5]' },
];

export const QuestionScreen = ({ refreshKey, onAnswered }: QuestionScreenProps) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState('loading');
  const [answer, setAnswer] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState<SubmittedAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState<number | null>(null);
  const trimmedAnswerLength = answer.trim().length;
  const answerProgress = Math.min(100, Math.round((trimmedAnswerLength / MIN_ANSWER_LENGTH) * 100));

  useEffect(() => {
    const loadQuestion = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/question');
        const result = (await response.json()) as QuestionPayload | ApiErrorPayload;

        if (!response.ok || result.status !== 'ok') {
          showToast(result.status === 'error' ? result.message : 'Unable to load today’s question.');
          return;
        }

        setQuestion(result.data.question);
        setPhase(result.data.phase);
        setSubmittedAnswer(result.data.answer);
      } catch (error) {
        console.error(error);
        showToast('Unable to load today’s question.');
      } finally {
        setLoading(false);
      }
    };

    void loadQuestion();
  }, [refreshKey]);

  const handleSubmit = async () => {
    if (!question || !answer.trim()) return;
    setSubmitting(true);

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, answerText: answer.trim() }),
      });
      const result = (await response.json()) as AnswerSubmitPayload | ApiErrorPayload;

      if (!response.ok || result.status !== 'ok') {
        showToast(result.status === 'error' ? result.message : 'Unable to submit answer.');
        return;
      }

      setAnswer('');
      setSubmittedAnswer(result.data.answer);
      setCelebrationStreak(result.data.profile.streak.current);
      window.dispatchEvent(new CustomEvent('mimic:sound', { detail: 'submit' }));
      onAnswered?.();
      showToast('Answer submitted for tomorrow’s investigation.');
    } catch (error) {
      console.error(error);
      showToast('Unable to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-[520px] w-full rounded-lg" />;
  }

  return (
    <>
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-6 bg-[#fbfcf8]" data-tour-target="question-card">
        <div className="flex flex-wrap items-center gap-2">
          {tiles.map((tile, index) => (
            <span
              key={`${tile.letter}-${index}`}
              className={`grid h-12 w-12 place-items-center rounded-sm border-2 border-[#101418] text-2xl font-black text-white shadow-[3px_3px_0_#101418] ${tile.tone}`}
            >
              {tile.letter}
            </span>
          ))}
        </div>

        <div>
          <p className="text-xs font-black uppercase text-[#ef5b4f]">{formatDisplayDate(question?.date) || 'Today'} / {phase}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#101418]">
            {question?.text ?? 'No prompt is registered for this day yet.'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-black leading-6 text-[#303943]">
            Write the answer only a real person would write. Tomorrow, everyone tries to decide whether it was human, AI, or a hybrid.
          </p>
          {question?.sourceHint ? <p className="mt-3 text-sm font-semibold text-[#303943]">{question.sourceHint}</p> : null}
        </div>

        {submittedAnswer ? (
          <div className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] p-5 shadow-[4px_4px_0_#101418]">
            <p className="text-xl font-black text-[#101418]">You already answered today.</p>
            <p className="mt-2 text-sm font-semibold text-[#303943]">Your answer is saved for tomorrow’s investigation poll.</p>
            <p className="mt-4 rounded-sm border-2 border-[#101418] bg-white p-4 text-sm font-semibold leading-7 text-[#101418]">{submittedAnswer.text}</p>
          </div>
        ) : (
          <>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={8}
              maxLength={MAX_ANSWER_LENGTH}
              placeholder="Use a tiny scene, a specific object, or an imperfect thought. Make it hard for Mimic to fake you."
              className="w-full resize-none rounded-sm border-2 border-[#101418] bg-white px-4 py-4 text-base font-semibold leading-7 text-[#101418] outline-none transition focus:bg-[#f3fffd] focus:shadow-[4px_4px_0_#00a7a5]"
            />

            <div className="space-y-3 rounded-sm border-2 border-[#101418] bg-[#fff9df] p-4 shadow-[3px_3px_0_#101418]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black text-[#101418]">Tomorrow’s voters need enough detail to judge your voice.</p>
                <span className={`font-mono text-sm font-black ${trimmedAnswerLength >= MIN_ANSWER_LENGTH ? 'text-[#00a7a5]' : 'text-[#ef5b4f]'}`}>
                  {answer.length}/{MAX_ANSWER_LENGTH} · min {MIN_ANSWER_LENGTH}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-sm border-2 border-[#101418] bg-white">
                <div className="h-full bg-[#00a7a5] transition-all duration-300" style={{ width: `${answerProgress}%` }} />
              </div>
              <div className="grid gap-2 text-xs font-black uppercase text-[#303943] sm:grid-cols-3">
                <span>Specific detail</span>
                <span>Human rhythm</span>
                <span>One honest wrinkle</span>
              </div>
            </div>

            <Button disabled={!question || trimmedAnswerLength < MIN_ANSWER_LENGTH} loading={submitting} onClick={handleSubmit} data-sound="select">
              {trimmedAnswerLength >= MIN_ANSWER_LENGTH ? 'Submit for tomorrow' : 'Keep writing'}
            </Button>
          </>
        )}
      </Card>

      <div className="space-y-4">
        {[
          ['Answer today', 'Write the human response that goes into tomorrow’s pool.'],
          ['Investigate yesterday', 'Guess which anonymous answers came from people or Mimic.'],
          ['Check results', 'See the real labels, XP, clues, and what the AI learned.'],
        ].map(([label, description], index) => (
          <div key={label} className="rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-4 shadow-[4px_4px_0_#101418]">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-sm border-2 border-[#101418] font-black text-white ${index === 0 ? 'bg-[#00a7a5]' : index === 1 ? 'bg-[#ef5b4f]' : 'bg-[#c6a448] text-[#101418]'}`}>
                {index + 1}
              </span>
              <div>
                <p className="font-black text-[#101418]">{label}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#303943]">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {celebrationStreak !== null ? (
      <StreakCelebrationPopup
        streak={celebrationStreak}
        body="Your answer is locked in for tomorrow’s investigation. The tower gets one brick stronger."
        onClose={() => setCelebrationStreak(null)}
      />
    ) : null}
    </>
  );
};
