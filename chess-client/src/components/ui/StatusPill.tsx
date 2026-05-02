type DotColor = 'success' | 'warning' | 'danger' | 'purple' | 'blue';
type PillVariant = 'default' | 'purple';

interface StatusPillProps {
  label: string;
  dot?: DotColor;
  variant?: PillVariant;
  className?: string;
}

const dotClasses: Record<DotColor, string> = {
  success: 'bg-accent-success glow-dot-success',
  warning: 'bg-accent-warning glow-dot-warning',
  danger:  'bg-accent-danger  glow-dot-danger',
  purple:  'bg-brand-purple   glow-dot-purple',
  blue:    'bg-brand-blue     glow-dot-blue',
};

const pillClasses: Record<PillVariant, string> = {
  default: 'bg-white/[0.03] border-half border-border-default text-text-secondary',
  purple:  'bg-brand-purple/[0.08] border-half border-brand-purple/25 text-[#c0a7f5]',
};

export function StatusPill({
  label,
  dot = 'success',
  variant = 'default',
  className = '',
}: StatusPillProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-[11px] py-[5px] rounded-pill ${pillClasses[variant]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[dot]}`} />
      <span className="text-[11px] tracking-[0.3px] leading-none">{label}</span>
    </div>
  );
}
