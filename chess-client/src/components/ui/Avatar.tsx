interface AvatarProps {
  initial: string;
  size?: number;
  /** 'brand' = blue-purple gradient (you); 'dark' = charcoal gradient (opponent) */
  variant?: 'brand' | 'dark';
}

export function Avatar({ initial, size = 30, variant = 'brand' }: AvatarProps) {
  const bgClass =
    variant === 'dark'
      ? 'bg-gradient-to-br from-[#2c2c2a] to-[#444441] border-half border-white/15'
      : 'bg-brand-gradient';

  return (
    <div
      className={`${bgClass} rounded-full flex items-center justify-center text-white font-medium shrink-0`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial.charAt(0).toUpperCase()}
    </div>
  );
}
