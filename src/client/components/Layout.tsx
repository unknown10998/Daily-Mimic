import { useMemo, useState, type ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
  currentStreak?: number;
  streakLastSuccessAt?: string | undefined;
  onLogout?: () => void;
  showLogout?: boolean;
  darkTheme?: boolean;
  fixedNavOffset?: boolean;
};

const getTodayIso = (): string => new Date().toISOString().slice(0, 10);

const getStreakStage = (streak: number): 'foundation' | 'pillar' | 'tower' | 'fortress' => {
  if (streak >= 30) return 'fortress';
  if (streak >= 11) return 'tower';
  if (streak >= 4) return 'pillar';
  return 'foundation';
};

const getStreakTone = (streak: number): 'cool' | 'charged' | 'legendary' => {
  if (streak >= 30) return 'legendary';
  if (streak >= 6) return 'charged';
  return 'cool';
};

const getStreakLabel = (streak: number): string => {
  if (streak >= 30) return 'Fortress streak';
  if (streak >= 11) return 'Tower streak';
  if (streak >= 4) return 'Pillar streak';
  if (streak >= 1) return 'Foundation streak';
  return 'Start your tower';
};

type StreakTowerProps = {
  streak: number;
  atRisk: boolean;
};

export const StreakTower = ({ streak, atRisk }: StreakTowerProps) => {
  const stage = getStreakStage(streak);
  const tone = getStreakTone(streak);
  const bricks = Math.max(1, Math.min(stage === 'fortress' ? 14 : stage === 'tower' ? 10 : stage === 'pillar' ? 7 : 3, streak || 1));
  const showFlag = streak >= 7;
  const showScaffold = atRisk && streak > 0;

  return (
    <div className={`mimic-streak-tower mimic-streak-stage-${stage} mimic-streak-${tone} ${atRisk ? 'mimic-streak-risk' : ''}`} aria-hidden="true">
      <div className="mimic-streak-skyline">
        {stage === 'fortress' ? <span className="mimic-streak-spire" /> : null}
        {showFlag ? <span className="mimic-streak-flag" /> : null}
        {Array.from({ length: bricks }).map((_, index) => (
          <span key={index} className="mimic-streak-brick" />
        ))}
        {showScaffold ? (
          <>
            <span className="mimic-streak-scaffold mimic-streak-scaffold-left" />
            <span className="mimic-streak-scaffold mimic-streak-scaffold-right" />
          </>
        ) : null}
      </div>
      <span className="mimic-streak-dust" />
    </div>
  );
};

type StreakCelebrationPopupProps = {
  streak: number;
  title?: string;
  body: string;
  onClose: () => void;
};

export const StreakCelebrationPopup = ({ streak, title = 'Brick placed', body, onClose }: StreakCelebrationPopupProps) => (
  <div className="mimic-popup-overlay fixed inset-0 z-[70] grid min-h-svh place-items-center overflow-y-auto bg-[#101418]/70 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
    <div
      className="mimic-popup-content w-full max-w-md rounded-sm border-4 border-[#101418] bg-[#fff9df] p-5 text-center shadow-[7px_7px_0_#101418] sm:p-6 sm:shadow-[8px_8px_0_#101418]"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Streak brick placed"
    >
      <p className="text-xs font-black uppercase text-[#ef5b4f]">{title}</p>
      <div className="mt-4 flex justify-center">
        <StreakTower streak={streak} atRisk={false} />
      </div>
      <h3 className="mt-4 text-3xl font-black text-[#101418]">{streak} day streak</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#303943]">{body}</p>
      <button
        type="button"
        onClick={onClose}
        data-sound="close"
        className="mt-5 inline-flex w-full items-center justify-center rounded-sm border-2 border-[#101418] bg-[#ef5b4f] px-5 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_#101418] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#101418]"
      >
        Nice
      </button>
    </div>
  </div>
);

export const Layout = ({ children, currentStreak = 0, streakLastSuccessAt, onLogout, showLogout = false, darkTheme = false, fixedNavOffset = false }: LayoutProps) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const streakAtRisk = currentStreak > 0 && streakLastSuccessAt !== getTodayIso();
  const streakLabel = useMemo(() => getStreakLabel(currentStreak), [currentStreak]);

  return (
    <div className={`min-h-screen bg-[#e9eef1] text-[#101418] ${darkTheme ? 'mimic-dark' : ''}`}>
      <div className={`mx-auto flex min-h-screen max-w-[1180px] flex-col px-4 pb-12 sm:px-6 lg:px-8 ${fixedNavOffset ? 'pt-24 sm:pt-24' : 'pt-5'}`}>
        <header className="border-b-2 border-[#101418] pb-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              {showLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-sm border-2 border-[#101418] bg-[#ef5b4f] px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_#101418] transition hover:bg-[#d94a40]"
                >
                  Logout
                </button>
              ) : null}
              <div className="flex items-center gap-3">
                {logoFailed ? (
                  <div className="inline-flex h-16 w-24 rotate-[-2deg] items-center justify-center rounded-sm border-2 border-[#101418] bg-[#00a7a5] text-2xl font-black text-white shadow-[5px_5px_0_#101418]">M</div>
                ) : (
                  <img
                    src="/logo.png"
                    alt="Mimic Daily"
                    onError={() => setLogoFailed(true)}
                    className="h-16 w-24 rotate-[-2deg] rounded-sm border-2 border-[#101418] bg-[#fbfcf8] object-cover shadow-[5px_5px_0_#101418]"
                  />
                )}
                <div>
                  <p className="text-sm font-black uppercase text-[#ef5b4f]">Mimic Daily</p>
                  <h1 className="text-3xl font-black leading-tight text-[#101418] sm:text-4xl">
                    Every day, one hidden story.
                  </h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-[#303943]">
                Write today. Judge tomorrow. Learn which voices were human, which were Mimic, and which were somewhere in between.
              </p>
            </div>
            <div className={`mimic-streak-card self-center rounded-sm border-2 border-[#101418] px-4 py-3 text-center shadow-[4px_4px_0_#101418] sm:self-start sm:text-right ${streakAtRisk ? 'bg-[#fff1d8]' : 'bg-[#fff9df]'}`}>
              <div className="flex items-center justify-center gap-3 sm:justify-end">
                <StreakTower streak={currentStreak} atRisk={streakAtRisk} />
                <div>
                  <p className="mimic-streak-label text-xs font-black uppercase text-[#ef5b4f]">{streakLabel}</p>
                  <p className="mimic-streak-count mt-1 text-4xl font-black leading-none text-[#101418]">{currentStreak}</p>
                  <p className="mimic-streak-days mt-1 text-xs font-black uppercase text-[#303943]">{currentStreak === 1 ? 'day built' : 'days built'}</p>
                </div>
              </div>
              <p className={`mimic-streak-status mt-3 text-xs font-black uppercase ${streakAtRisk ? 'text-[#ef5b4f]' : 'text-[#101418]'}`}>
                {streakAtRisk ? 'Place today’s brick' : currentStreak >= 7 ? 'Milestone structure' : 'Structure stable'}
              </p>
            </div>
          </div>
        </header>

        <main className="relative flex-1 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
};
