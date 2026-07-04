import type { HTMLAttributes } from 'react';

type StatTileProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string;
  tone?: 'warm' | 'soft';
};

const toneClasses: Record<NonNullable<StatTileProps['tone']>, string> = {
  warm: 'bg-[#fff9df] text-[#101418]',
  soft: 'bg-[#dff6f4] text-[#101418]',
};

export const StatTile = ({ label, value, tone = 'soft', className = '', ...props }: StatTileProps) => {
  return (
    <div className={`mimic-tilt-tile rounded-sm border-2 border-[#101418] p-4 shadow-[3px_3px_0_#101418] ${toneClasses[tone]} ${className}`} {...props}>
      <p className="text-xs font-black uppercase text-[#303943]">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-[#101418]">{value}</p>
    </div>
  );
};
