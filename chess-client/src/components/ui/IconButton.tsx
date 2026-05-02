import { type ReactNode } from 'react';

type IconButtonVariant = 'default' | 'brand' | 'danger';

interface IconButtonProps {
  icon: ReactNode;
  variant?: IconButtonVariant;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses: Record<IconButtonVariant, string> = {
  default: 'bg-white/[0.04] border-border-strong   text-text-secondary hover:bg-white/[0.07]',
  brand:   'bg-brand-blue/[0.15] border-border-brand text-text-primary  hover:bg-brand-blue/[0.22]',
  danger:  'bg-accent-danger/[0.08] border-accent-danger/25 text-[#f09595] hover:bg-accent-danger/[0.14]',
};

export function IconButton({
  icon,
  variant = 'default',
  onClick,
  children,
  className = '',
  disabled = false,
  type = 'button',
}: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-[5px] border-half rounded-lg px-3 py-[9px] text-[12px] font-medium cursor-pointer transition-colors font-sans disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
