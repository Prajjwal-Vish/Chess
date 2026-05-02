type LogoSize = 'sm' | 'md' | 'lg';

const iconPx: Record<LogoSize, number> = { sm: 22, md: 26, lg: 30 };
const textClass: Record<LogoSize, string> = {
  sm: 'text-[18px]',
  md: 'text-[21px]',
  lg: 'text-[24px]',
};

interface LogoProps {
  size?: LogoSize;
}

export function Logo({ size = 'md' }: LogoProps) {
  const s = iconPx[size];
  return (
    <div className="flex items-center gap-[10px]">
      <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
        <path d="M9 22h10l-1-3H10l-1 3z" fill="#5b8def" />
        <path
          d="M11 19c0-2 1-3 1-5 0-1-1-2-1-2s2-1 3-3c1 1 2 2 4 2 0 0-1 1-1 3 0 2 1 3 1 5h-7z"
          fill="#5b8def"
        />
        <circle cx="14" cy="9" r="1.2" fill="#0a1027" />
      </svg>
      <span className={`${textClass[size]} font-medium text-brand-gradient`}>SnapFen</span>
    </div>
  );
}
