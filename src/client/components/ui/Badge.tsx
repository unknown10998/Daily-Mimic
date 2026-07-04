import type { HTMLAttributes, ReactNode } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: 'warm' | 'soft';
};

const toneStyles: Record<NonNullable<BadgeProps['tone']>, string> = {
  warm: 'border-[#101418] bg-[#ef5b4f] text-white',
  soft: 'border-[#101418] bg-[#dff6f4] text-[#101418]',
};

export const Badge = ({ children, tone = 'soft', className = '', ...props }: BadgeProps) => {
  return (
    <span className={`inline-flex rounded-sm border-2 px-3 py-1 text-xs font-black uppercase ${toneStyles[tone]} ${className}`} {...props}>
      {children}
    </span>
  );
};
