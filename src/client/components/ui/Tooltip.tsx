import type { ReactNode } from 'react';

interface TooltipProps {
  tip: string;
  children: ReactNode;
}

export const Tooltip = ({ tip, children }: TooltipProps) => {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-2xl bg-[#3f2a15] px-3 py-2 text-xs text-[#fff7ed] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {tip}
      </div>
    </div>
  );
};
