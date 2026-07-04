import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const Card = ({ children, className = '', ...props }: CardProps) => {
  return (
    <div
      className={`mimic-tilt-card rounded-sm border-2 border-[var(--border)] bg-[var(--surface)] px-5 py-6 shadow-[6px_6px_0_#101418] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
