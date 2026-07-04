import { useEffect, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';

type LeaderboardEntry = {
  playerId: string;
  username: string;
  rank: number;
  score: number;
  level: number;
  levelRank: string;
  adjective: string;
  currentStreak: number;
  lastActiveAt: string;
};

const toTitleCase = (value: string): string => {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
};

export const LeaderboardView = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        const result = await response.json();

        if (!response.ok || result.status !== 'ok') {
          showToast(result.message || 'Could not load the leaderboard.');
          return;
        }

        setEntries(result.data.entries);
      } catch (error) {
        console.error(error);
        showToast('Could not load the leaderboard.');
      } finally {
        setLoading(false);
      }
    };

    void loadLeaderboard();
  }, []);

  if (loading) {
    return <Skeleton className="h-[520px] w-full rounded-lg" />;
  }

  const rankGroups = entries.reduce<Array<{ rank: string; players: LeaderboardEntry[] }>>((groups, player) => {
    const existing = groups.find((group) => group.rank === player.levelRank);
    if (existing) {
      existing.players.push(player);
      return groups;
    }
    return [...groups, { rank: player.levelRank, players: [player] }];
  }, []);

  return (
    <section className="space-y-8">
      <Card className="bg-[#fbfcf8] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-[#ef5b4f]">Leaderboard</p>
            <h2 className="mt-3 text-3xl font-black text-[#101418]">People who have actually played.</h2>
            <p className="mt-2 text-sm font-semibold text-[#303943]">These scores are saved from real profiles in the Devvit backend.</p>
          </div>
          <Badge tone="soft">{entries.length} players</Badge>
        </div>
      </Card>

      <Card className="bg-[#dff6f4] p-5">
        <p className="text-xs font-black uppercase text-[#ef5b4f]">How ranks work</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#303943]">
          Score is XP. XP raises your level, levels place you into rank bands, and each rank band gives your profile an adjective so the board reads like a real daily-game ladder.
        </p>
      </Card>

      <Card className="bg-[#fbfcf8] p-6" data-tour-target="leaderboard-list">
        {entries.length === 0 ? (
          <div className="rounded-sm border-2 border-[#101418] bg-[#dff6f4] p-5">
            <p className="font-black text-[#101418]">No scores yet.</p>
            <p className="mt-2 text-sm font-semibold text-[#303943]">Sign up, answer a prompt, and vote to put the first name here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rankGroups.map((group) => (
              <div key={group.rank} className="space-y-3">
                <p className="text-xs font-black uppercase text-[#ef5b4f]">{toTitleCase(group.rank)} Rank</p>
                {group.players.map((player) => (
                  <div key={player.playerId} className="flex flex-col gap-4 rounded-sm border-2 border-[#101418] bg-white px-4 py-4 shadow-[3px_3px_0_#101418] sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3 sm:items-center">
                      <span className={`grid h-11 w-11 place-items-center rounded-sm border-2 border-[#101418] font-black ${
                        player.rank === 1 ? 'bg-[#c6a448]' : player.rank === 2 ? 'bg-[#00a7a5] text-white' : player.rank === 3 ? 'bg-[#ef5b4f] text-white' : 'bg-[#fbfcf8]'
                      }`}>
                        {player.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="break-all font-black text-[#101418]">u/{player.username}</p>
                        <p className="break-words text-sm font-semibold leading-6 text-[#303943]">{toTitleCase(player.adjective)} {toTitleCase(player.levelRank)} · Level {player.level} · {player.currentStreak} Day Streak</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center border-t-2 border-[#101418] pt-3 text-left sm:block sm:border-t-0 sm:pt-0 sm:text-right gap-3">
                      <p className="text-xs font-black uppercase text-[#66707a]">Amount of XP:   </p>
                      <p className="text-xl font-black text-[#101418]">{player.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
};
