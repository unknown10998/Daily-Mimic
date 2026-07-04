import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton = ({ className = '', ...props }: SkeletonProps) => {
  return <div className={`animate-pulse rounded-3xl bg-[#f6e4d7] ${className}`} {...props} />;
};
