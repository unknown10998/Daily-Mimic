import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton = ({ className = '', ...props }: SkeletonProps) => {
  return (
    <div
      className={`mimic-glint grid place-items-center rounded-sm border-2 border-[#101418] bg-[#fbfcf8] text-sm font-black uppercase text-[#303943] shadow-[4px_4px_0_#101418] ${className}`}
      {...props}
    >
      <span className="relative z-10 rounded-sm border-2 border-[#101418] bg-[#fff9df] px-3 py-2 shadow-[3px_3px_0_#101418]">Fetching data...</span>
    </div>
  );
};
