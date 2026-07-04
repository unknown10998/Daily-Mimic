import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import { applyDocumentTheme, getInitialDarkTheme, watchPreferredTheme } from './utils/theme';

export const Splash = () => {
  const [darkTheme, setDarkTheme] = useState(getInitialDarkTheme);

  useEffect(() => {
    applyDocumentTheme(darkTheme);
  }, [darkTheme]);

  useEffect(() => watchPreferredTheme(setDarkTheme), []);

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center px-5 ${darkTheme ? 'mimic-dark bg-[#101418] text-[#f4f7f8]' : 'bg-[#e9eef1] text-[#101418]'}`}>
      <div className={`max-w-xl rotate-[-1deg] rounded-sm border-2 border-[#101418] px-6 py-10 shadow-[8px_8px_0_#101418] sm:px-10 ${darkTheme ? 'bg-[#172028]' : 'bg-[#fbfcf8]'}`}>
        <div className="space-y-5 text-center">
          <div className="mimic-fade-in mx-auto flex h-16 w-16 items-center justify-center rounded-sm border-2 border-[#101418] bg-[#00a7a5] text-2xl font-black text-white shadow-[5px_5px_0_#101418]">M</div>
          <h1 className={`mimic-fade-in mimic-fade-in-delay-1 text-3xl font-black leading-tight sm:text-4xl ${darkTheme ? 'text-[#f4f7f8]' : 'text-[#101418]'}`}>Mimic Daily</h1>
          <p className={`mimic-fade-in mimic-fade-in-delay-2 text-sm font-semibold leading-7 ${darkTheme ? 'text-[#d8e1e6]' : 'text-[#303943]'}`}>
            Write today, judge tomorrow, and see which voices fooled the room.
          </p>
          <button
            type="button"
            className="mimic-fade-in mimic-fade-in-delay-3 inline-flex items-center justify-center rounded-sm border-2 border-[#101418] bg-[#ef5b4f] px-8 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_#101418] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#101418]"
            onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
          >
            Open Mimic
          </button>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
