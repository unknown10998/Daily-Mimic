import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@devvit/web/client';
import { Layout } from './components/Layout';
import { HomeView } from './components/HomeView';
import { DailyInvestigationView } from './components/DailyInvestigationView';
import { ResultsView } from './components/ResultsView';
import { ProfileView } from './components/ProfileView';
import { AchievementsView } from './components/AchievementsView';
import { LeaderboardView } from './components/LeaderboardView';
import { HistoryView } from './components/HistoryView';
import { QuestionScreen } from './components/QuestionScreen';
import { LoginView } from './components/LoginView';
import { Button } from './components/ui/Button';
import { Skeleton } from './components/ui/Skeleton';
import { Modal } from './components/ui/Modal';
import { applyDocumentTheme, getInitialDarkTheme, watchPreferredTheme } from './utils/theme';

const pages = [
  { key: 'home', label: 'Home' },
  { key: 'question', label: 'Question' },
  { key: 'investigation', label: 'Investigate' },
  { key: 'results', label: 'Results' },
  { key: 'history', label: 'History' },
  { key: 'profile', label: 'Profile' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'leaderboard', label: 'Leaderboard' },
] as const;

type Page = (typeof pages)[number]['key'];
type TourPlacement = 'top-left' | 'top-right' | 'center-left' | 'center-right' | 'lower-left' | 'lower-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';
type TourArrow = 'up' | 'down' | 'left' | 'right';

type TourStep = {
  page: Page;
  title: string;
  body: string;
  placement: TourPlacement;
  arrow: TourArrow;
  target: 'home-hook' | 'question-card' | 'investigation-card' | 'results-card' | 'history-card' | 'profile-card' | 'achievements-list' | 'leaderboard-list' | 'nav-tools';
  scrollOffsetY?: number;
};

type SessionData = {
  profile: {
    username: string;
    streak: {
      current: number;
      lastSuccessAt?: string;
    };
  };
  registered: boolean;
  displayName: string;
};

type TourHighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TourConnector = {
  top: number;
  left: number;
  width: number;
  angle: number;
};

const pageLabels: Record<Page, string> = {
  home: 'Home',
  question: 'Daily Question',
  investigation: 'Investigation',
  results: 'Results',
  history: 'History',
  profile: 'Profile',
  achievements: 'Achievements',
  leaderboard: 'Leaderboard',
};

const tourPanelClass: Record<TourPlacement, string> = {
  'top-left': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-auto sm:bottom-auto sm:left-6 sm:top-24 sm:w-[min(560px,calc(100vw-3rem))] sm:max-w-xl',
  'top-right': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-[min(560px,calc(100vw-3rem))] sm:max-w-xl',
  'center-left': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-auto sm:bottom-auto sm:left-6 sm:top-1/2 sm:w-[min(560px,calc(100vw-3rem))] sm:max-w-xl sm:-translate-y-1/2',
  'center-right': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-1/2 sm:w-[min(560px,calc(100vw-3rem))] sm:max-w-xl sm:-translate-y-1/2',
  'lower-left': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-auto sm:bottom-auto sm:left-6 sm:top-[64vh] sm:w-[min(560px,calc(100vw-3rem))] sm:max-w-xl sm:-translate-y-1/2',
  'lower-right': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-[64vh] sm:w-[min(560px,calc(100vw-3rem))] sm:max-w-xl sm:-translate-y-1/2',
  'bottom-left': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[min(560px,calc(100vw-3rem))] sm:max-w-xl',
  'bottom-right': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[min(560px,calc(100vw-3rem))] sm:max-w-xl',
  'bottom-center': 'fixed inset-x-4 bottom-3 z-[60] mx-auto w-[calc(100vw-2rem)] max-w-sm sm:inset-x-4 sm:bottom-6 sm:max-w-xl',
};

const tourArrowGlyph: Record<TourArrow, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '➜',
};

const tourArrowClass: Record<TourArrow, string> = {
  up: '-top-12 left-1/2 -translate-x-1/2 sm:-top-16 sm:left-8 sm:translate-x-0',
  down: '-top-12 left-1/2 -translate-x-1/2 sm:-bottom-16 sm:left-8 sm:top-auto sm:translate-x-0',
  left: '-top-12 left-1/2 -translate-x-1/2 sm:-left-16 sm:top-8 sm:translate-x-0',
  right: '-top-12 left-1/2 -translate-x-1/2 sm:-right-16 sm:top-8 sm:translate-x-0',
};

const getVisibleTourTarget = (targetName: TourStep['target']): HTMLElement | null => {
  const targets = Array.from(document.querySelectorAll(`[data-tour-target="${targetName}"]`));
  const visibleTarget = targets.find((target): target is HTMLElement => {
    if (!(target instanceof HTMLElement)) return false;
    const rect = target.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  return visibleTarget ?? null;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

type SoundEffect = 'click' | 'nav' | 'select' | 'submit' | 'reveal' | 'tour' | 'close' | 'settings' | 'logout';

type SoundTone = {
  frequency: number;
  endFrequency?: number;
  start: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
};

const soundPatterns = (streak: number): Record<SoundEffect, SoundTone[]> => {
  const streakPitch = 2 ** (Math.min(streak, 12) / 12);

  return {
    click: [{ frequency: 330 * streakPitch, endFrequency: 495 * streakPitch, start: 0, duration: 0.055, gain: 0.022, type: 'square' }],
    nav: [
      { frequency: 392, endFrequency: 494, start: 0, duration: 0.055, gain: 0.02, type: 'square' },
      { frequency: 587, endFrequency: 659, start: 0.045, duration: 0.06, gain: 0.014, type: 'triangle' },
    ],
    select: [
      { frequency: 220, endFrequency: 196, start: 0, duration: 0.035, gain: 0.028, type: 'square' },
      { frequency: 660, endFrequency: 520, start: 0.012, duration: 0.04, gain: 0.01, type: 'triangle' },
    ],
    submit: [
      { frequency: 330, endFrequency: 392, start: 0, duration: 0.075, gain: 0.022, type: 'triangle' },
      { frequency: 440, endFrequency: 523, start: 0.07, duration: 0.08, gain: 0.02, type: 'triangle' },
      { frequency: 660, endFrequency: 784, start: 0.145, duration: 0.12, gain: 0.018, type: 'sine' },
    ],
    reveal: [
      { frequency: 262, start: 0, duration: 0.18, gain: 0.014, type: 'triangle' },
      { frequency: 330, start: 0.018, duration: 0.18, gain: 0.012, type: 'triangle' },
      { frequency: 392, start: 0.036, duration: 0.2, gain: 0.012, type: 'triangle' },
      { frequency: 784, endFrequency: 988, start: 0.18, duration: 0.08, gain: 0.01, type: 'sine' },
    ],
    tour: [
      { frequency: 523, endFrequency: 587, start: 0, duration: 0.045, gain: 0.014, type: 'sine' },
      { frequency: 659, endFrequency: 698, start: 0.04, duration: 0.05, gain: 0.012, type: 'sine' },
    ],
    close: [{ frequency: 392, endFrequency: 247, start: 0, duration: 0.08, gain: 0.02, type: 'square' }],
    settings: [
      { frequency: 440, endFrequency: 554, start: 0, duration: 0.07, gain: 0.016, type: 'triangle' },
      { frequency: 554, endFrequency: 660, start: 0.065, duration: 0.08, gain: 0.014, type: 'triangle' },
    ],
    logout: [
      { frequency: 330, endFrequency: 262, start: 0, duration: 0.07, gain: 0.018, type: 'square' },
      { frequency: 220, endFrequency: 165, start: 0.055, duration: 0.09, gain: 0.014, type: 'triangle' },
    ],
  };
};

const playMimicSound = (effect: SoundEffect, soundVolume: number, streak: number): void => {
  if (soundVolume <= 0 || !window.AudioContext) return;

  try {
    const audio = new AudioContext();
    const volume = clamp(soundVolume / 100, 0, 1);
    const tones = soundPatterns(streak)[effect];
    let latestStop = 0;

    tones.forEach((tone) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const startAt = audio.currentTime + tone.start;
      const stopAt = startAt + tone.duration;

      oscillator.type = tone.type ?? 'square';
      oscillator.frequency.setValueAtTime(tone.frequency, startAt);
      if (tone.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endFrequency), stopAt);
      }

      gain.gain.setValueAtTime(Math.max(0.0001, tone.gain * volume), startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(startAt);
      oscillator.stop(stopAt);
      latestStop = Math.max(latestStop, tone.start + tone.duration);
    });

    window.setTimeout(() => void audio.close(), Math.ceil((latestStop + 0.08) * 1000));
  } catch (error) {
    console.error(error);
  }
};

const getInitialSoundVolume = (): number => {
  const stored = Number(localStorage.getItem('mimic-volume') ?? '45');
  return Number.isFinite(stored) ? clamp(stored, 0, 100) : 45;
};

const getTourConnectorPoints = (popupRect: DOMRect, targetRect: TourHighlightRect) => {
  const popupCenter = {
    x: popupRect.left + popupRect.width / 2,
    y: popupRect.top + popupRect.height / 2,
  };
  const targetCenter = {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2,
  };
  const popupPadding = 12;
  const targetPadding = 8;

  const popupDeltaX = targetCenter.x - popupCenter.x;
  const popupDeltaY = targetCenter.y - popupCenter.y;
  const usePopupSide = Math.abs(popupDeltaX / Math.max(1, popupRect.width)) > Math.abs(popupDeltaY / Math.max(1, popupRect.height));
  const start = usePopupSide
    ? {
      x: popupDeltaX >= 0 ? popupRect.right : popupRect.left,
      y: clamp(targetCenter.y, popupRect.top + popupPadding, popupRect.bottom - popupPadding),
    }
    : {
      x: clamp(targetCenter.x, popupRect.left + popupPadding, popupRect.right - popupPadding),
      y: popupDeltaY >= 0 ? popupRect.bottom : popupRect.top,
    };

  const targetDeltaX = popupCenter.x - targetCenter.x;
  const targetDeltaY = popupCenter.y - targetCenter.y;
  const useTargetSide = Math.abs(targetDeltaX / Math.max(1, targetRect.width)) > Math.abs(targetDeltaY / Math.max(1, targetRect.height));
  const end = useTargetSide
    ? {
      x: targetDeltaX >= 0 ? targetRect.left + targetRect.width : targetRect.left,
      y: clamp(popupCenter.y, targetRect.top + targetPadding, targetRect.top + targetRect.height - targetPadding),
    }
    : {
      x: clamp(popupCenter.x, targetRect.left + targetPadding, targetRect.left + targetRect.width - targetPadding),
      y: targetDeltaY >= 0 ? targetRect.top + targetRect.height : targetRect.top,
    };

  return { start, end };
};

const tourSteps: TourStep[] = [
  {
    page: 'home',
    title: 'Welcome to Mimic Daily',
    body: 'This is the dashboard. It shows today’s prompt, the monthly AI personality, the weekly theme, your level, XP, streak, and live community stats.',
    placement: 'bottom-left',
    arrow: 'up',
    target: 'home-hook',
  },
  {
    page: 'question',
    title: 'Answer today',
    body: 'Write a real human answer to today’s question. Your answer is saved for tomorrow, when other players try to decide whether it was human or AI.',
    placement: 'bottom-right',
    arrow: 'up',
    target: 'question-card',
    scrollOffsetY: 70,
  },
  {
    page: 'investigation',
    title: 'Investigate yesterday',
    body: 'Pick Human, AI, or Hybrid for every anonymous answer. Add reasoning and confidence. Useful reasoning can earn XP, and correct AI reasoning helps Mimic learn for future days.',
    placement: 'top-right',
    arrow: 'down',
    target: 'investigation-card',
  },
  {
    page: 'results',
    title: 'Read the outcome',
    body: 'Results show yesterday’s poll, the real labels, daily difficulty, community clues, and the humanity heatmap built from player reasoning.',
    placement: 'center-right',
    arrow: 'left',
    target: 'results-card',
  },
  {
    page: 'history',
    title: 'Review your calls',
    body: 'History keeps your previous investigations, your choices, the real labels, and whether each call was correct.',
    placement: 'lower-left',
    arrow: 'right',
    target: 'history-card',
  },
  {
    page: 'profile',
    title: 'Grow your profile',
    body: 'Profile shows score, level progress, your streak, saved record, and the public badge shelf where pinned achievements appear.',
    placement: 'bottom-right',
    arrow: 'up',
    target: 'profile-card',
  },
  {
    page: 'achievements',
    title: 'Hunt achievements',
    body: 'Achievements has the full badge list. Locked badges hide their names but show hints, and unlocked badges can be pinned to your public shelf.',
    placement: 'top-left',
    arrow: 'down',
    target: 'achievements-list',
    scrollOffsetY: 60,
  },
  {
    page: 'leaderboard',
    title: 'Climb the ranks',
    body: 'Leaderboard groups players by level rank, shows their level, adjective, streak, and XP. Higher levels get stronger rank titles.',
    placement: 'bottom-right',
    arrow: 'up',
    target: 'leaderboard-list',
  },
  {
    page: 'home',
    title: 'Settings',
    body: 'Use Settings for dark theme and sound effects. The rest of the nav moves you through the daily loop.',
    placement: 'top-right',
    arrow: 'up',
    target: 'nav-tools',
  },
];

export const App = () => {
  const [page, setPage] = useState<Page>('question');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [openSettings, setOpenSettings] = useState(false);
  const [refreshKey] = useState(0);
  const [darkTheme, setDarkTheme] = useState(getInitialDarkTheme);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('mimic-sound') !== 'off');
  const [soundVolume, setSoundVolume] = useState(getInitialSoundVolume);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourHighlightRect, setTourHighlightRect] = useState<TourHighlightRect | null>(null);
  const [tourConnector, setTourConnector] = useState<TourConnector | null>(null);
  const currentTourStep = tourSteps[tourIndex];
  const audioStreak = session?.profile.streak.current ?? 0;

  useEffect(() => {
    applyDocumentTheme(darkTheme);
    localStorage.setItem('mimic-theme', darkTheme ? 'dark' : 'light');
  }, [darkTheme]);

  useEffect(() => watchPreferredTheme(setDarkTheme), []);

  useEffect(() => {
    localStorage.setItem('mimic-sound', soundEnabled ? 'on' : 'off');
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('mimic-volume', `${soundVolume}`);
  }, [soundVolume]);

  useEffect(() => {
    if (!soundEnabled || soundVolume <= 0) return undefined;

    const playButtonSound = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest('button');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;
      const effect = (button.dataset.sound ?? 'click') as SoundEffect;
      playMimicSound(effect, soundVolume, audioStreak);
    };

    const playCustomSound = (event: Event) => {
      const effect = event instanceof CustomEvent && typeof event.detail === 'string' ? event.detail as SoundEffect : 'click';
      playMimicSound(effect, soundVolume, audioStreak);
    };

    document.addEventListener('pointerup', playButtonSound);
    window.addEventListener('mimic:sound', playCustomSound);
    return () => {
      document.removeEventListener('pointerup', playButtonSound);
      window.removeEventListener('mimic:sound', playCustomSound);
    };
  }, [audioStreak, soundEnabled, soundVolume]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!tourActive) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const scrollKeys = new Set(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' ']);
    const preventTourScroll = (event: Event) => event.preventDefault();
    const preventTourKeyScroll = (event: KeyboardEvent) => {
      if (scrollKeys.has(event.key)) event.preventDefault();
    };

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('wheel', preventTourScroll, { passive: false });
    document.addEventListener('touchmove', preventTourScroll, { passive: false });
    document.addEventListener('keydown', preventTourKeyScroll);

    return () => {
      document.removeEventListener('wheel', preventTourScroll);
      document.removeEventListener('touchmove', preventTourScroll);
      document.removeEventListener('keydown', preventTourKeyScroll);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [tourActive]);

  useEffect(() => {
    if (!sessionLoading && session?.registered === true && localStorage.getItem('mimic-tour-seen') !== 'true') {
      const timer = window.setTimeout(() => {
        setTourIndex(0);
        setPage(tourSteps[0]?.page ?? 'home');
        setTourActive(true);
      }, 250);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [sessionLoading, session?.registered]);

  useEffect(() => {
    const clearActiveTargets = () => {
      document.querySelectorAll('.mimic-tour-active-target').forEach((element) => {
        element.classList.remove('mimic-tour-active-target');
        element.removeAttribute('data-tour-active');
      });
    };

    if (!tourActive || !currentTourStep) {
      clearActiveTargets();
      return undefined;
    }

    const updateActiveTarget = () => {
      clearActiveTargets();
      const isMobile = window.matchMedia('(max-width: 639px)').matches;
      if (isMobile) return;

      const target = getVisibleTourTarget(currentTourStep.target);

      if (target instanceof HTMLElement) {
        target.classList.add('mimic-tour-active-target');
        target.setAttribute('data-tour-active', 'true');
      }
    };

    updateActiveTarget();
    window.addEventListener('resize', updateActiveTarget);

    return () => {
      window.removeEventListener('resize', updateActiveTarget);
      clearActiveTargets();
    };
  }, [currentTourStep, tourActive]);

  useEffect(() => {
    if (!tourActive || !currentTourStep || loading) return undefined;

    let cancelled = false;
    const scrollToTarget = () => {
      const target = getVisibleTourTarget(currentTourStep.target);
      if (!target) return;

      const previousBodyOverflow = document.body.style.overflow;
      const previousHtmlOverflow = document.documentElement.style.overflow;
      const rect = target.getBoundingClientRect();
      const targetCenterY = rect.top + window.scrollY + rect.height / 2;
      const stepOffset = currentTourStep.scrollOffsetY ?? 0;
      const isMobile = window.matchMedia('(max-width: 639px)').matches;
      const nav = document.querySelector('nav');
      const navHeight = nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 64;
      const popup = document.querySelector('[data-tour-popup="true"]');
      const popupHeight = popup instanceof HTMLElement ? popup.getBoundingClientRect().height : 230;
      const mobileBottomReserve = isMobile ? Math.min(window.innerHeight * 0.45, popupHeight + 34) : 0;
      const visibleTop = isMobile ? navHeight + 14 : 0;
      const visibleBottom = Math.max(visibleTop + 180, window.innerHeight - mobileBottomReserve);
      const desiredViewportCenter = isMobile ? visibleTop + (visibleBottom - visibleTop) / 2 : window.innerHeight / 2;
      const top = Math.max(0, targetCenterY - desiredViewportCenter + stepOffset);

      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      window.scrollTo({ top, behavior: 'smooth' });

      window.setTimeout(() => {
        if (cancelled || !tourActive) return;
        document.body.style.overflow = previousBodyOverflow || 'hidden';
        document.documentElement.style.overflow = previousHtmlOverflow || 'hidden';
      }, 520);
    };

    const timers = [120, 380, 760].map((delay) => window.setTimeout(scrollToTarget, delay));
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [currentTourStep, loading, page, tourActive]);

  useEffect(() => {
    if (!tourActive || !currentTourStep) {
      return undefined;
    }

    const updateHighlight = () => {
      const isMobile = window.matchMedia('(max-width: 639px)').matches;
      if (isMobile) {
        setTourHighlightRect(null);
        setTourConnector(null);
        return;
      }

      const target = getVisibleTourTarget(currentTourStep.target);

      if (!(target instanceof HTMLElement)) {
        setTourHighlightRect(null);
        setTourConnector(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        setTourHighlightRect(null);
        setTourConnector(null);
        return;
      }

      const highlightRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
      setTourHighlightRect(highlightRect);

      const popup = document.querySelector('[data-tour-popup="true"]');
      if (!(popup instanceof HTMLElement)) {
        setTourConnector(null);
        return;
      }

      const popupRect = popup.getBoundingClientRect();
      const { start, end } = getTourConnectorPoints(popupRect, highlightRect);
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const distance = Math.hypot(deltaX, deltaY);

      setTourConnector({
        top: start.y,
        left: start.x,
        width: Math.max(36, distance),
        angle: Math.atan2(deltaY, deltaX),
      });
    };

    let frame = 0;
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateHighlight);
    };
    const timers = [80, 180, 320, 520, 820, 1200, 1700].map((delay) => window.setTimeout(scheduleUpdate, delay));
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    const mutationObserver = new MutationObserver(scheduleUpdate);
    const contentRoot = document.querySelector(`[data-tour-page="${currentTourStep.page}"]`);
    const popup = document.querySelector('[data-tour-popup="true"]');
    const observedTarget = getVisibleTourTarget(currentTourStep.target);

    if (contentRoot instanceof HTMLElement) resizeObserver.observe(contentRoot);
    if (popup instanceof HTMLElement) resizeObserver.observe(popup);
    if (observedTarget instanceof HTMLElement) resizeObserver.observe(observedTarget);
    if (contentRoot instanceof HTMLElement) mutationObserver.observe(contentRoot, { childList: true, subtree: true, attributes: true });

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [currentTourStep, loading, page, tourActive]);

  const loadSession = async () => {
    try {
      const response = await fetch('/api/session');
      const result = await response.json();

      if (!response.ok || result.status !== 'ok') {
        showToast(result.message || 'Could not check your Reddit session.');
        return;
      }

      setSession(result.data);
    } catch (error) {
      console.error(error);
      showToast('Could not check your Reddit session.');
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch('/api/session');
        const result = await response.json();

        if (!response.ok || result.status !== 'ok') {
          showToast(result.message || 'Could not check your Reddit session.');
          return;
        }

        setSession(result.data);
      } catch (error) {
        console.error(error);
        showToast('Could not check your Reddit session.');
      } finally {
        setSessionLoading(false);
      }
    };

    void run();
  }, []);

  const activeContent = useMemo(() => {
    switch (page) {
      case 'question':
        return <QuestionScreen refreshKey={refreshKey} onAnswered={loadSession} />;
      case 'investigation':
        return <DailyInvestigationView />;
      case 'results':
        return <ResultsView />;
      case 'history':
        return <HistoryView />;
      case 'profile':
        return <ProfileView />;
      case 'achievements':
        return <AchievementsView />;
      case 'leaderboard':
        return <LeaderboardView />;
      default:
        return <HomeView />;
    }
  }, [page, refreshKey]);

  const handleNavigate = (target: Page) => {
    setMobileNavOpen(false);
    if (target === page) return;
    setLoading(true);
    window.setTimeout(() => {
      setPage(target);
      setLoading(false);
    }, 220);
  };


  const handleLogout = () => {
    setAuthMode('login');
    setSession((current) => current ? { ...current, registered: false } : current);
    setPage('question');
    setOpenSettings(false);
    setMobileNavOpen(false);
    showToast('Logged out of Mimic on this device.');
  };

  const handleSaveSettings = () => {
    localStorage.setItem('mimic-theme', darkTheme ? 'dark' : 'light');
    localStorage.setItem('mimic-sound', soundEnabled ? 'on' : 'off');
    localStorage.setItem('mimic-volume', `${soundVolume}`);
    setOpenSettings(false);
    showToast('Settings saved.');
  };

  const startTour = () => {
    setTourHighlightRect(null);
    setTourConnector(null);
    setTourIndex(0);
    setLoading(false);
    setPage(tourSteps[0]?.page ?? 'home');
    setTourActive(true);
  };

  const closeTour = () => {
    localStorage.setItem('mimic-tour-seen', 'true');
    setTourHighlightRect(null);
    setTourConnector(null);
    setTourActive(false);
  };

  const nextTourStep = () => {
    if (tourIndex >= tourSteps.length - 1) {
      closeTour();
      return;
    }
    const nextIndex = tourIndex + 1;
    setTourIndex(nextIndex);
    setLoading(false);
    setPage(tourSteps[nextIndex]?.page ?? 'home');
  };

  const previousTourStep = () => {
    const nextIndex = Math.max(0, tourIndex - 1);
    setTourIndex(nextIndex);
    setLoading(false);
    setPage(tourSteps[nextIndex]?.page ?? 'home');
  };

  const renderTourOverlay = () => {
    if (!tourHighlightRect) {
      return <div className="mimic-popup-overlay fixed inset-0 z-40 bg-[#101418]/60 backdrop-blur-[1px]" />;
    }

    const padding = 10;
    const top = Math.max(0, tourHighlightRect.top - padding);
    const left = Math.max(0, tourHighlightRect.left - padding);
    const right = Math.max(0, window.innerWidth - tourHighlightRect.left - tourHighlightRect.width - padding);
    const bottom = Math.max(0, window.innerHeight - tourHighlightRect.top - tourHighlightRect.height - padding);
    const middleTop = top;
    const middleHeight = Math.min(window.innerHeight, tourHighlightRect.height + padding * 2);

    return (
      <>
        <div className="mimic-popup-overlay mimic-tour-overlay-panel fixed left-0 right-0 top-0 z-40 bg-[#101418]/60 backdrop-blur-[1px]" style={{ height: top }} />
        <div className="mimic-popup-overlay mimic-tour-overlay-panel fixed bottom-0 left-0 right-0 z-40 bg-[#101418]/60 backdrop-blur-[1px]" style={{ height: bottom }} />
        <div className="mimic-popup-overlay mimic-tour-overlay-panel fixed left-0 z-40 bg-[#101418]/60 backdrop-blur-[1px]" style={{ top: middleTop, width: left, height: middleHeight }} />
        <div className="mimic-popup-overlay mimic-tour-overlay-panel fixed right-0 z-40 bg-[#101418]/60 backdrop-blur-[1px]" style={{ top: middleTop, width: right, height: middleHeight }} />
      </>
    );
  };

  const renderApp = () => (
    <>
      <div className="space-y-6 pt-20">
        <nav className="fixed left-0 right-0 top-0 z-50 border-b-2 border-[#101418] bg-[#e9eef1]/95 px-4 py-2 backdrop-blur">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              data-sound="nav"
              data-tour-target="nav-tools"
              className="grid h-9 w-9 place-items-center rounded-sm border-2 border-[#101418] bg-[#fbfcf8] text-lg font-black text-[#101418] shadow-[3px_3px_0_#101418] lg:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>
            <div className="min-w-0 flex-1 lg:flex-none">
              <p className="text-xs font-black uppercase text-[#ef5b4f]">{pageLabels[page]}</p>
              <p className="hidden text-xs font-semibold text-[#303943] sm:block">Daily prompt, voting, results, and player progress.</p>
            </div>
            <div className="hidden flex-wrap items-center gap-2 lg:flex" data-tour-target="nav-tools">
              {pages.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigate(item.key)}
                  data-sound="nav"
                  className={`h-8 rounded-sm border-2 px-2.5 text-xs font-black uppercase transition ${
                    item.key === page
                      ? 'border-[#101418] bg-[#00a7a5] text-white shadow-[3px_3px_0_#101418]'
                      : 'border-[#101418] bg-[#fbfcf8] text-[#101418] hover:bg-[#dff6f4]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <Button variant="secondary" onClick={startTour} data-sound="tour" className="h-8 px-2.5 py-0 text-xs">
                Tour
              </Button>
              {session?.registered === true ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  data-sound="logout"
                  className="h-8 rounded-sm border-2 border-[#101418] bg-[#ef5b4f] px-2.5 text-xs font-black uppercase text-white shadow-[3px_3px_0_#101418] transition hover:bg-[#d94a40]"
                >
                  Logout
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpenSettings(true)}
                data-sound="settings"
                className="grid h-8 w-8 place-items-center rounded-sm border-2 border-[#101418] bg-[#fbfcf8] text-base font-black text-[#101418] shadow-[3px_3px_0_#101418] transition hover:bg-[#dff6f4]"
                aria-label="Open settings"
                title="Settings"
              >
                ⚙
              </button>
            </div>
          </div>
        </nav>

        {mobileNavOpen ? (
          <div className="mimic-popup-overlay fixed inset-0 z-[60] overflow-hidden bg-[#101418]/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileNavOpen(false)}>
            <aside
              className="mimic-drawer-card mimic-popup-content h-svh max-h-svh w-[min(84vw,340px)] overflow-hidden border-r-4 border-[#101418] bg-[#fbfcf8] p-3 shadow-[10px_0_0_#101418]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    setOpenSettings(true);
                  }}
                  data-sound="settings"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border-2 border-[#101418] bg-[#fbfcf8] text-base font-black text-[#101418] shadow-[3px_3px_0_#101418] transition hover:bg-[#dff6f4]"
                  aria-label="Open settings"
                  title="Settings"
                >
                  ⚙
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase text-[#ef5b4f]">Mimic menu</p>
                  <h2 className="mt-1 text-2xl font-black text-[#101418]">{pageLabels[page]}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  data-sound="close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border-2 border-[#101418] bg-[#ef5b4f] text-lg font-black text-white shadow-[3px_3px_0_#101418]"
                  aria-label="Close navigation"
                >
                  x
                </button>
              </div>
              <div className="mt-4 grid gap-1.5">
                {pages.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavigate(item.key)}
                    data-sound="nav"
                    className={`h-10 rounded-sm border-2 px-3 text-left text-xs font-black uppercase transition ${
                      item.key === page
                        ? 'border-[#101418] bg-[#00a7a5] text-white shadow-[3px_3px_0_#101418]'
                        : 'border-[#101418] bg-white text-[#101418] hover:bg-[#dff6f4]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-1.5">
                <Button variant="secondary" onClick={() => { setMobileNavOpen(false); startTour(); }} data-sound="tour" className="h-10 w-full py-0 text-xs">
                  Tour
                </Button>
                {session?.registered === true ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    data-sound="logout"
                    className="h-10 w-full rounded-sm border-2 border-[#101418] bg-[#ef5b4f] px-4 text-xs font-black uppercase text-white shadow-[3px_3px_0_#101418] transition hover:bg-[#d94a40]"
                  >
                    Logout
                  </button>
                ) : null}
              </div>
            </aside>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-[520px] w-full rounded-lg" />
          </div>
        ) : (
          <div data-tour-page={page} data-tour-target="page">
            {activeContent}
          </div>
        )}
      </div>

      <Modal open={openSettings} className="max-w-lg">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-[#ef5b4f]">Settings</p>
              <h2 className="mt-2 text-2xl font-black text-[#101418]">Game settings</h2>
            </div>
            <Button variant="ghost" onClick={() => setOpenSettings(false)} data-sound="close">
              Close
            </Button>
          </div>
          <label className="flex items-center justify-between rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-4">
            <span>
              <span className="block font-black text-[#101418]">Dark theme</span>
              <span className="text-sm font-semibold text-[#303943]">Use the lower-light Mimic board.</span>
            </span>
            <input type="checkbox" checked={darkTheme} onChange={(event) => setDarkTheme(event.target.checked)} className="h-5 w-5 accent-[#00a7a5]" />
          </label>
          <label className="flex items-center justify-between rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-4">
            <span>
              <span className="block font-black text-[#101418]">Sound effects</span>
              <span className="text-sm font-semibold text-[#303943]">Play a small click sound on buttons.</span>
            </span>
            <input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} className="h-5 w-5 accent-[#00a7a5]" />
          </label>
          <label className="block rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-4">
            <span className="flex items-center justify-between gap-4">
              <span>
                <span className="block font-black text-[#101418]">Volume</span>
                <span className="text-sm font-semibold text-[#303943]">Set click sound volume.</span>
              </span>
              <span className="font-mono text-sm font-black text-[#101418]">{soundVolume}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={soundVolume}
              onChange={(event) => setSoundVolume(Number(event.target.value))}
              className="mt-4 w-full accent-[#00a7a5]"
              aria-label="Sound effect volume"
            />
          </label>
          <Button onClick={handleSaveSettings} data-sound="settings" className="w-full">
            Save settings
          </Button>
        </div>
      </Modal>

      {tourActive && currentTourStep ? (
        <>
          {renderTourOverlay()}
          {tourHighlightRect ? (
            <div
              className="mimic-tour-highlight pointer-events-none fixed z-[55] hidden animate-pulse rounded-sm border-4 border-[#fff9df] shadow-[0_0_0_4px_#101418,6px_6px_0_#ef5b4f] sm:block"
              style={{
                top: tourHighlightRect.top,
                left: tourHighlightRect.left,
                width: tourHighlightRect.width,
                height: tourHighlightRect.height,
              }}
              aria-hidden="true"
            />
          ) : null}
          {tourConnector ? (
            <div
              className="mimic-tour-connector pointer-events-none fixed z-[59] hidden h-1 origin-left rounded-full bg-[#fff9df] shadow-[0_0_0_2px_#101418] sm:block"
              style={{
                top: tourConnector.top,
                left: tourConnector.left,
                width: tourConnector.width,
                transform: `rotate(${tourConnector.angle}rad)`,
              }}
              aria-hidden="true"
            >
              <span className="absolute -right-1.5 -top-[6px] h-0 w-0 border-y-[8px] border-l-[14px] border-y-transparent border-l-[#fff9df] drop-shadow-[2px_2px_0_#101418]" />
            </div>
          ) : null}
          <div className={tourPanelClass[currentTourStep.placement]}>
            <div data-tour-popup="true" className="mimic-popup-card mimic-popup-content mimic-tour-card relative max-h-[58svh] overflow-y-auto rounded-sm border-4 border-[#101418] bg-white p-3 shadow-[4px_4px_0_#101418] sm:max-h-[calc(100vh-7rem)] sm:p-5 sm:shadow-[9px_9px_0_#101418]">
              <span
                className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 text-5xl font-black leading-none text-[#fff9df] [text-shadow:4px_4px_0_#101418] sm:hidden"
                aria-hidden="true"
              >
                ↑
              </span>
              <span
                className={`pointer-events-none absolute hidden text-6xl font-black leading-none text-[#fff9df] [text-shadow:4px_4px_0_#101418] sm:block ${tourArrowClass[currentTourStep.arrow]}`}
                aria-hidden="true"
              >
                {tourArrowGlyph[currentTourStep.arrow]}
              </span>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-[#ef5b4f]">
                    Tour {tourIndex + 1}/{tourSteps.length} · {pageLabels[currentTourStep.page]}
                  </p>
                  <h2 className="mt-2 text-xl font-black text-[#101418] sm:text-2xl">{currentTourStep.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeTour}
                  data-sound="close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border-2 border-[#101418] bg-[#ef5b4f] text-lg font-black text-white shadow-[3px_3px_0_#101418]"
                  aria-label="Close tour"
                >
                  x
                </button>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#303943]">{currentTourStep.body}</p>
              <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={closeTour} data-sound="close" className="text-sm font-black uppercase text-[#66707a]">
                  Skip tour
                </button>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button variant="secondary" disabled={tourIndex === 0} onClick={previousTourStep} data-sound="tour">
                    Back
                  </Button>
                  <Button onClick={nextTourStep} data-sound="tour">
                    {tourIndex >= tourSteps.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );

  return (
    <Layout currentStreak={session?.profile.streak.current ?? 0} streakLastSuccessAt={session?.profile.streak.lastSuccessAt} darkTheme={darkTheme} fixedNavOffset={session?.registered === true}>
      {sessionLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-[520px] w-full rounded-lg" />
        </div>
      ) : session && !session.registered ? (
        <LoginView username={session.displayName || session.profile.username} mode={authMode} onComplete={loadSession} />
      ) : (
        renderApp()
      )}
    </Layout>
  );
};
