import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost';
  icon?: ReactNode;
  loading?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'border-2 border-[#101418] bg-[#ef5b4f] text-white shadow-[4px_4px_0_#101418] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#101418]',
  secondary:
    'border-2 border-[#101418] bg-[#fbfcf8] text-[#101418] shadow-[3px_3px_0_#101418] hover:bg-[#dff6f4]',
  soft: 'border-2 border-[#101418] bg-[#c6a448] text-[#101418] shadow-[3px_3px_0_#101418] hover:bg-[#d8ba5b]',
  ghost: 'border-2 border-transparent bg-transparent text-[#101418] hover:border-[#101418] hover:bg-[#fbfcf8]',
};

export const Button = ({
  variant = 'primary',
  icon,
  loading,
  children,
  className = '',
  ...props
}: ButtonProps) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-5 py-3 text-sm font-black uppercase transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
