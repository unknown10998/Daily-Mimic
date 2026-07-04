import { useEffect, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

type Achievement = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  secret?: boolean;
  unlocked: boolean;
};

type ProfilePayload = {
  status: 'ok';
  data: {
    achievements: Achievement[];
    pinnedAchievementIds: string[];
  };
};

export const AchievementsView = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pinnedAchievementIds, setPinnedAchievementIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        const response = await fetch('/api/profile');
        const result = (await response.json()) as ProfilePayload;

        if (!response.ok || result.status !== 'ok') {
          showToast('Could not load achievements.');
          return;
        }

        setAchievements(result.data.achievements);
        setPinnedAchievementIds(result.data.pinnedAchievementIds ?? []);
      } catch (error) {
        console.error(error);
        showToast('Could not load achievements.');
      } finally {
        setLoading(false);
      }
    };

    void loadAchievements();
  }, []);

  const savePinnedAchievements = async (nextPinnedIds: string[]) => {
    setPinnedAchievementIds(nextPinnedIds);
    try {
      const response = await fetch('/api/profile/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementIds: nextPinnedIds }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'ok') {
        showToast(result.message || 'Could not update badge shelf.');
        return;
      }
      setPinnedAchievementIds(result.data.pinnedAchievementIds);
    } catch (error) {
      console.error(error);
      showToast('Could not update badge shelf.');
    }
  };

  const togglePinnedAchievement = (achievement: Achievement) => {
    if (!achievement.unlocked) return;
    if (pinnedAchievementIds.includes(achievement.id)) {
      void savePinnedAchievements(pinnedAchievementIds.filter((id) => id !== achievement.id));
      return;
    }
    if (pinnedAchievementIds.length >= 3) {
      showToast('Your badge shelf can hold 3 achievements.');
      return;
    }
    void savePinnedAchievements([...pinnedAchievementIds, achievement.id]);
  };

  if (loading) {
    return <Skeleton className="h-[520px] w-full rounded-lg" />;
  }

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <section className="space-y-6">
      <Card className="bg-[#fbfcf8] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#ef5b4f]">Achievements</p>
            <h2 className="mt-3 text-3xl font-black text-[#101418]">{unlockedCount}/{achievements.length} unlocked</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#303943]">
              Locked achievements hide their names, but each one gives a hint. Pin up to 3 unlocked achievements to your profile shelf.
            </p>
          </div>
          <Badge tone="warm">{pinnedAchievementIds.length}/3 pinned</Badge>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2" data-tour-target="achievements-list">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`mimic-tilt-card rounded-sm border-2 border-[#101418] p-4 shadow-[3px_3px_0_#101418] ${
              achievement.unlocked ? 'bg-[#dff6f4]' : 'bg-white opacity-80'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={achievement.unlocked ? 'warm' : 'soft'}>{achievement.unlocked ? 'Unlocked' : achievement.secret ? 'Secret' : 'Locked'}</Badge>
              <span className="rounded-sm border-2 border-[#101418] bg-[#fff9df] px-2 py-1 text-xs font-black uppercase text-[#101418]">
                {achievement.secret && !achievement.unlocked ? '??? XP' : `+${achievement.xpReward} XP`}
              </span>
            </div>
            <p className="mt-3 text-lg font-black text-[#101418]">{achievement.title}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#303943]">{achievement.description}</p>
            {achievement.unlocked ? (
              <Button variant={pinnedAchievementIds.includes(achievement.id) ? 'soft' : 'secondary'} className="mt-4 h-9 px-3 py-0 text-xs" onClick={() => togglePinnedAchievement(achievement)}>
                {pinnedAchievementIds.includes(achievement.id) ? 'Unpin badge' : 'Pin badge'}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
};
