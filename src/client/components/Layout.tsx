import { useState, type ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
  currentStreak?: number;
  onLogout?: () => void;
  showLogout?: boolean;
  darkTheme?: boolean;
  fixedNavOffset?: boolean;
};

export const Layout = ({ children, currentStreak = 0, onLogout, showLogout = false, darkTheme = false, fixedNavOffset = false }: LayoutProps) => {
  const [logoFailed, setLogoFailed] = useState(false);

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
            <div className="self-start rounded-sm border-2 border-[#101418] bg-[#fff9df] px-4 py-3 text-right shadow-[4px_4px_0_#101418]">
              <p className="text-xs font-black uppercase text-[#ef5b4f]">Current streak</p>
              <p className="mt-1 text-2xl font-black text-[#101418]">{currentStreak} days</p>
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
