import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import { formatDisplayDate } from '../utils/date';

type HistoryItem = {
  questionId: string;
  questionText: string;
  questionDate: string;
  answerId: string;
  answerText: string;
  selected: 'human' | 'ai' | 'hybrid';
  actual: 'human' | 'ai' | 'hybrid';
  correct: boolean;
  submittedAt: string;
};

type HistoryPayload = {
  status: 'ok';
  data: {
    items: HistoryItem[];
  };
};

const label = (value: HistoryItem['selected']) => {
  if (value === 'ai') return 'AI';
  return value[0]?.toUpperCase() + value.slice(1);
};

export const HistoryView = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/history');
        const result = (await response.json()) as HistoryPayload;

        if (!response.ok || result.status !== 'ok') {
          showToast('Could not load your history.');
          return;
        }

        setItems(result.data.items);
      } catch (error) {
        console.error(error);
        showToast('Could not load your history.');
      } finally {
        setLoading(false);
      }
    };

    void loadHistory();
  }, []);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, HistoryItem[]>>((acc, item) => {
      const key = `${item.questionDate}:${item.questionId}`;
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [items]);

  if (loading) {
    return <Skeleton className="h-[520px] w-full rounded-lg" />;
  }

  return (
    <section className="space-y-6">
      <Card className="bg-[#fbfcf8] p-6" data-tour-target="history-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[#ef5b4f]">History</p>
            <h2 className="mt-3 text-3xl font-black text-[#101418]">Your previous poll choices.</h2>
            <p className="mt-2 text-sm font-semibold text-[#303943]">Investigation choices stay here, with the answer and whether you got it right.</p>
          </div>
          <Badge tone="soft">{items.length} choices</Badge>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card className="bg-[#fbfcf8] p-6">
          <p className="font-black text-[#101418]">No history yet.</p>
          <p className="mt-2 text-sm font-semibold text-[#303943]">Vote in an investigation poll and your choices will appear here.</p>
        </Card>
      ) : (
        Object.entries(grouped).map(([groupKey, groupItems]) => {
          const first = groupItems[0];
          if (!first) return null;

          return (
            <Card key={groupKey} className="space-y-4 bg-[#fbfcf8] p-6">
              <div>
                <p className="text-xs font-black uppercase text-[#ef5b4f]">{formatDisplayDate(first.questionDate)}</p>
                <h3 className="mt-2 text-2xl font-black text-[#101418]">{first.questionText}</h3>
              </div>

              <div className="grid gap-4">
                {groupItems.map((item) => (
                  <article key={`${item.answerId}:${item.submittedAt}`} className="rounded-sm border-2 border-[#101418] bg-white p-4 shadow-[3px_3px_0_#101418]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Badge tone={item.correct ? 'soft' : 'warm'}>{item.correct ? 'Correct' : 'Wrong'}</Badge>
                      <p className="text-sm font-black text-[#303943]">You chose {label(item.selected)} · Actual {label(item.actual)}</p>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-7 text-[#101418]">{item.answerText}</p>
                  </article>
                ))}
              </div>
            </Card>
          );
        })
      )}
    </section>
  );
};
