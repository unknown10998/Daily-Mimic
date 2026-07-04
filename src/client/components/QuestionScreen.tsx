import { useEffect, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
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

type ApiErrorPayload = {
  status: 'error';
  message: string;
};

type QuestionScreenProps = {
  refreshKey: number;
};

const MIN_ANSWER_LENGTH = 250;

const tiles = [
  { letter: 'M', tone: 'bg-[#00a7a5]' },
  { letter: 'I', tone: 'bg-[#ef5b4f]' },
  { letter: 'M', tone: 'bg-[#c6a448]' },
  { letter: 'I', tone: 'bg-[#101418]' },
  { letter: 'C', tone: 'bg-[#00a7a5]' },
];

export const QuestionScreen = ({ refreshKey }: QuestionScreenProps) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [phase, setPhase] = useState('loading');
  const [answer, setAnswer] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState<SubmittedAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      const result = await response.json();

      if (!response.ok || result.status !== 'ok') {
        showToast(result.message || 'Unable to submit answer.');
        return;
      }

      setAnswer('');
      setSubmittedAnswer(result.data.answer);
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
              maxLength={800}
              placeholder="Write a real answer with enough detail that tomorrow’s voters have something to judge."
              className="w-full resize-none rounded-sm border-2 border-[#101418] bg-white px-4 py-4 text-base font-semibold leading-7 text-[#101418] outline-none transition focus:bg-[#f3fffd] focus:shadow-[4px_4px_0_#00a7a5]"
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#303943]">Your answer goes into tomorrow’s investigation poll.</p>
              <span className={`font-mono text-sm font-black ${answer.trim().length >= MIN_ANSWER_LENGTH ? 'text-[#00a7a5]' : 'text-[#ef5b4f]'}`}>
                {answer.length}/800 · min {MIN_ANSWER_LENGTH}
              </span>
            </div>

            <Button disabled={!question || answer.trim().length < MIN_ANSWER_LENGTH} loading={submitting} onClick={handleSubmit}>
              {answer.trim().length >= MIN_ANSWER_LENGTH ? 'Submit for tomorrow' : 'Keep writing'}
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
  );
};
