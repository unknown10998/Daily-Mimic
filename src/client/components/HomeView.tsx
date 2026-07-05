import { useEffect, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { StatTile } from './ui/StatTile';
import { Skeleton } from './ui/Skeleton';
import { ProgressBar } from './ui/ProgressBar';

type LevelProgress = {
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelRequirement: number;
  progressPercent: number;
};

type GameStats = {
  activeDate: string;
  promptText: string;
  aiStyleName: string;
  aiStyleClue: string;
  weeklyTheme: string;
  totalAnswersToday: number;
  totalVotesToday: number;
  communityAccuracy: number;
  registeredPlayers: number;
  averageScore: number;
  currentStreak: number;
  totalScore: number;
  levelProgress: LevelProgress;
  daysRegistered: number;
};

export const HomeView = () => {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const result = await response.json();

        if (!response.ok || result.status !== 'ok') {
          showToast(result.message || 'Could not load today’s numbers.');
          return;
        }

        setStats(result.data.stats);
      } catch (error) {
        console.error(error);
        showToast('Could not load today’s numbers.');
      } finally {
        setLoading(false);
      }
    };

    void loadStats();
  }, []);

  if (loading) {
    return <Skeleton className="h-[520px] w-full rounded-lg" />;
  }

  return (
    <section className="space-y-8">
      <Card className="space-y-5 bg-[#fbfcf8]" data-tour-target="home-hook">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#ef5b4f]">The hook</p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-[#101418]">A daily Reddit game where the crowd teaches the AI that tries to fool them.</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#303943]">
              Write one real answer, investigate yesterday’s anonymous Human, AI, and Hybrid responses, then watch Mimic adapt from the community’s reasoning. Simple to play, harder every day.
            </p>
          </div>
          <Badge tone="warm">Built for daily play</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['1 minute', 'Answer today’s prompt with a real, specific human moment.'],
            ['Next day', 'Vote Human, AI, or Hybrid on anonymous answers.'],
            ['The hook', 'Gemini learns from the crowd and comes back harder.'],
          ].map(([label, description]) => (
            <div key={label} className="rounded-sm border-2 border-[#101418] bg-white p-4 shadow-[3px_3px_0_#101418]">
              <p className="text-xs font-black uppercase text-[#ef5b4f]">{label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#303943]">{description}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-6 bg-[#fbfcf8]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge tone="warm">Today</Badge>
              <h2 className="mt-4 text-3xl font-black leading-tight text-[#101418] sm:text-4xl">
                {stats?.promptText ?? 'Today’s prompt is getting ready.'}
              </h2>
            </div>
            <div className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] px-4 py-3 text-sm text-[#101418] shadow-[4px_4px_0_#101418]">
              <p className="font-black uppercase">Your streak</p>
              <p className="mt-1 text-2xl font-black">{stats?.currentStreak ?? 0} days</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile label="Answers today" value={`${stats?.totalAnswersToday ?? 0}`} tone="warm" />
            <StatTile label="Votes today" value={`${stats?.totalVotesToday ?? 0}`} tone="soft" />
            <StatTile label="AI style" value={stats?.aiStyleName ?? 'Loading'} tone="soft" />
            <StatTile label="Theme" value={stats?.weeklyTheme ?? 'Loading'} tone="warm" />
          </div>

          <div className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] p-4 shadow-[4px_4px_0_#101418]">
            <p className="text-sm font-black uppercase text-[#ef5b4f]">AI personality season</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#303943]">{stats?.aiStyleClue ?? 'Mimic is still warming up.'}</p>
          </div>

          <div className="flex flex-col gap-4 rounded-sm border-2 border-[#101418] bg-[#fff9df] p-6 shadow-[4px_4px_0_#101418] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-[#303943]">Community accuracy</p>
              <p className="mt-3 text-3xl font-black text-[#101418]">{stats?.communityAccuracy ?? 0}%</p>
            </div>
            <p className="text-sm font-semibold leading-6 text-[#303943]">
              Based on saved votes for the active day, not a canned demo number.
            </p>
          </div>
        </Card>

        <Card className="space-y-6 bg-[#fbfcf8]">
          <div>
            <p className="text-sm font-black uppercase text-[#ef5b4f]">Saved progress</p>
            <h3 className="mt-4 text-2xl font-black text-[#101418]">The game remembers what you do here.</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#303943]">
              Your score, streak, answers, and votes are stored through the Devvit backend.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile label="Level" value={`${stats?.levelProgress.level ?? 1}`} tone="soft" />
            <StatTile label="Your score" value={`${stats?.totalScore ?? 0}`} tone="warm" />
            <StatTile label="Avg score" value={`${stats?.averageScore ?? 0}`} tone="soft" />
            <StatTile label="Players" value={`${stats?.registeredPlayers ?? 0}`} tone="soft" />
            <StatTile label="Days made" value={`${stats?.daysRegistered ?? 0}`} tone="warm" />
          </div>
          <div className="space-y-3 rounded-sm border-2 border-[#101418] bg-white p-4">
            <ProgressBar progress={stats?.levelProgress.progressPercent ?? 0} label={`Level ${stats?.levelProgress.level ?? 1} · ${stats?.levelProgress.currentLevelXp ?? 0}/${stats?.levelProgress.nextLevelRequirement ?? 15} XP`} />
            <p className="text-sm font-semibold leading-6 text-[#303943]">
              Score and XP are the same. Answer daily, vote correctly, sweep an investigation, keep correct-call streaks, make hard reads, and write answers that feel suspiciously AI.
            </p>
          </div>
          <div className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] p-4 text-sm font-black text-[#101418] shadow-[3px_3px_0_#101418]">
            Use Question in the top nav to answer today.
          </div>
        </Card>
      </div>
    </section>
  );
};
