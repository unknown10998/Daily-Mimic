import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Card } from './ui/Card';
import { StatTile } from './ui/StatTile';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import { ProgressBar } from './ui/ProgressBar';
import { formatDisplayDate } from '../utils/date';

type PlayerProfile = {
  username: string;
  totalScore: number;
  totalVotes: number;
  correctVotes: number;
  totalAnswers: number;
  createdAt: string;
  lastActiveAt: string;
  streak: {
    current: number;
    best: number;
  };
  preferences?: {
    displayName?: string;
  };
};

type LevelProgress = {
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelRequirement: number;
  progressPercent: number;
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  secret?: boolean;
  unlocked: boolean;
};

export const ProfileView = () => {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pinnedAchievementIds, setPinnedAchievementIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        const result = await response.json();

        if (!response.ok || result.status !== 'ok') {
          showToast(result.message || 'Could not load your profile.');
          return;
        }

        setProfile(result.data.profile);
        setLevelProgress(result.data.levelProgress);
        setAchievements(result.data.achievements);
        setPinnedAchievementIds(result.data.pinnedAchievementIds ?? []);
      } catch (error) {
        console.error(error);
        showToast('Could not load your profile.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const accuracy = useMemo(() => {
    if (!profile || profile.totalVotes === 0) return 0;
    return Math.round((profile.correctVotes / profile.totalVotes) * 100);
  }, [profile]);

  if (loading) {
    return <Skeleton className="h-[520px] w-full rounded-lg" />;
  }

  const displayName = profile?.preferences?.displayName || profile?.username || 'Player';
  const joinedAt = formatDisplayDate(profile?.createdAt) || 'Today';
  const lastActiveAt = formatDisplayDate(profile?.lastActiveAt) || 'Today';
  const pinnedAchievements = pinnedAchievementIds.flatMap((id) => achievements.find((achievement) => achievement.id === id && achievement.unlocked) ?? []);

  return (
    <section className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-[#fbfcf8] p-6" data-tour-target="profile-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-[#ef5b4f]">Your profile</p>
              <h2 className="mt-3 text-3xl font-black text-[#101418]">{displayName}</h2>
              <p className="mt-2 text-sm font-semibold text-[#303943]">Signed in as u/{profile?.username ?? 'unknown'}</p>
            </div>
            <Badge tone="warm">Saved</Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <StatTile label="Current streak" value={`${profile?.streak.current ?? 0} days`} tone="soft" />
            <StatTile label="Best streak" value={`${profile?.streak.best ?? 0} days`} tone="soft" />
            <StatTile label="Accuracy" value={`${accuracy}%`} tone="warm" />
            <StatTile label="Score" value={`${profile?.totalScore ?? 0}`} tone="warm" />
          </div>
        </Card>
        <Card className="bg-[#fbfcf8] p-6">
          <p className="text-sm font-black uppercase text-[#ef5b4f]">Your saved record</p>
          <p className="mt-4 text-5xl font-black text-[#00a7a5]">{profile?.correctVotes ?? 0}</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#303943]">
            Correct calls out of {profile?.totalVotes ?? 0} saved votes.
          </p>
        </Card>
      </div>

      <Card className="space-y-5 bg-[#fbfcf8] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#ef5b4f]">Level progress</p>
            <h3 className="mt-3 text-3xl font-black text-[#101418]">Level {levelProgress?.level ?? 1}</h3>
          </div>
          <Badge tone="soft">{levelProgress?.xp ?? 0} XP</Badge>
        </div>
        <ProgressBar progress={levelProgress?.progressPercent ?? 0} label={`Level ${levelProgress?.level ?? 1} · ${levelProgress?.currentLevelXp ?? 0}/${levelProgress?.nextLevelRequirement ?? 15} XP`} />
        <p className="text-sm font-semibold leading-6 text-[#303943]">
          XP is the same number as your score. Earn XP by answering the daily prompt, making correct investigation calls, finishing a perfect investigation, keeping correct-call streaks, spotting answers that fooled most players, and writing human answers that get mistaken for AI.
        </p>
      </Card>

      <Card className="space-y-5 bg-[#fbfcf8] p-6">
        <div>
          <p className="text-sm font-black uppercase text-[#ef5b4f]">Public badge shelf</p>
          <h3 className="mt-3 text-3xl font-black text-[#101418]">{pinnedAchievements.length}/3 pinned</h3>
        </div>
        {pinnedAchievements.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {pinnedAchievements.map((achievement) => (
              <div key={achievement.id} className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] p-4 shadow-[3px_3px_0_#101418]">
                <Badge tone="warm">Pinned</Badge>
                <p className="mt-3 font-black text-[#101418]">{achievement.title}</p>
                <p className="mt-2 text-sm font-semibold text-[#303943]">{achievement.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-sm border-2 border-[#101418] bg-white p-4 text-sm font-semibold text-[#303943]">Pin up to 3 unlocked achievements to show off here.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-[#fbfcf8] p-6">
          <p className="text-sm font-black uppercase text-[#ef5b4f]">Answers written</p>
          <p className="mt-4 text-4xl font-black text-[#101418]">{profile?.totalAnswers ?? 0}</p>
          <p className="mt-2 text-sm font-semibold text-[#303943]">Every submitted answer is counted here.</p>
        </Card>
        <Card className="bg-[#fbfcf8] p-6">
          <p className="text-sm font-black uppercase text-[#ef5b4f]">Joined</p>
          <p className="mt-4 text-2xl font-black text-[#101418]">{joinedAt}</p>
          <p className="mt-2 text-sm font-semibold text-[#303943]">This is when your Reddit profile on Mimic was created.</p>
        </Card>
        <Card className="bg-[#fbfcf8] p-6">
          <p className="text-sm font-black uppercase text-[#ef5b4f]">Last seen</p>
          <p className="mt-4 text-2xl font-black text-[#101418]">{lastActiveAt}</p>
          <p className="mt-2 text-sm font-semibold text-[#303943]">Updated when you answer, vote, or sign up.</p>
        </Card>
      </div>
    </section>
  );
};
