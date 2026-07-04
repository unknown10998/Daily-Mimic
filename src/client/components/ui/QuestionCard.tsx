import { Card } from './Card';
import type { ReactNode } from 'react';

interface QuestionCardProps {
  title: string;
  question: string;
  note?: string;
  children: ReactNode;
}

export const QuestionCard = ({ title, question, note, children }: QuestionCardProps) => {
  return (
    <Card className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-[#a9744b]">{title}</p>
        <h2 className="text-3xl font-semibold leading-tight text-[#3f3020] sm:text-4xl">
          {question}
        </h2>
        {note ? <p className="text-sm leading-6 text-[#6d5240]">{note}</p> : null}
      </div>
      {children}
    </Card>
  );
};
