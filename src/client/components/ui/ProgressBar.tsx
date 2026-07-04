type ProgressBarProps = {
  progress: number;
  label?: string;
};

export const ProgressBar = ({ progress, label }: ProgressBarProps) => {
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  return (
    <div className="space-y-2">
      {label ? <div className="flex items-center justify-between text-sm font-black text-[#303943]"> <span>{label}</span> <span>{safeProgress}%</span></div> : null}
      <div className="h-4 overflow-hidden rounded-sm border-2 border-[#101418] bg-white">
        <div className="h-full bg-[#00a7a5] transition-all duration-300" style={{ width: `${safeProgress}%` }} />
      </div>
    </div>
  );
};
