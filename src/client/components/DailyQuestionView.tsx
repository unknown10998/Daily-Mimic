import { useMemo, useState } from 'react';
import { Button } from './ui/Button';
import { QuestionCard } from './ui/QuestionCard';
import { Toast } from './ui/Toast';

const prompt = {
  title: 'Today’s prompt',
  question: 'What is one small thing from your day that would be hard for a machine to fake?',
  note: 'Your answer stays hidden until the next investigation round.',
};

export const DailyQuestionView = () => {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const counter = useMemo(() => `${value.length}/280`, [value]);

  return (
    <section className="space-y-8">
      <QuestionCard title={prompt.title} question={prompt.question} note={prompt.note}>
        <div className="space-y-4">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={8}
            maxLength={280}
            placeholder="Write it like you would tell a friend."
            className="w-full resize-none rounded-[1.75rem] border border-[#f1d0b9] bg-white px-5 py-4 text-sm leading-7 text-[#4e3623] shadow-[0_20px_40px_rgba(141,84,46,0.12)] outline-none transition focus:border-[#d9883f] focus:ring-4 focus:ring-[#ffe4ce]"
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#7a5b3d]">A small real detail usually works better than a perfect sentence.</p>
            <span className="text-sm text-[#8a6442]">{counter}</span>
          </div>
          <Button
            onClick={() => {
              setSubmitted(true);
              setTimeout(() => setSubmitted(false), 2200);
            }}
            disabled={!value.trim()}
          >
            {value.trim() ? 'Submit answer' : 'Write your answer first'}
          </Button>
        </div>
      </QuestionCard>
      <Toast open={submitted} message="Answer submitted" description="Saved. It will show up in the next investigation." />
    </section>
  );
};
