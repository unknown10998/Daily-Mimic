import type { HTMLAttributes, ReactNode } from 'react';

type ModalProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  open: boolean;
};

export const Modal = ({ children, open, className = '', ...props }: ModalProps) => {
  if (!open) return null;

  return (
    <div className="mimic-popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#101418]/35 p-4 backdrop-blur-sm">
      <div
        className={`mimic-popup-card mimic-popup-content w-full max-w-xl rounded-sm border-2 border-[#101418] bg-[#fbfcf8] p-6 shadow-[8px_8px_0_#101418] ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  );
};
