import { type ReactNode } from 'react';

type PanelPadding = 'compact' | 'hero' | 'modal' | 'none';
type PanelRadius  = 'panel' | 'hero' | 'modal';

interface PanelProps {
  children: ReactNode;
  padding?: PanelPadding;
  radius?: PanelRadius;
  className?: string;
}

const paddingClasses: Record<PanelPadding, string> = {
  compact: 'px-[14px] py-[12px]',
  hero:    'px-[18px] py-[16px]',
  modal:   'px-[24px] py-[22px]',
  none:    '',
};

const radiusClasses: Record<PanelRadius, string> = {
  panel: 'rounded-panel',
  hero:  'rounded-hero',
  modal: 'rounded-modal',
};

export function Panel({
  children,
  padding = 'compact',
  radius = 'panel',
  className = '',
}: PanelProps) {
  return (
    <div
      className={`bg-bg-panel border-half border-border-default ${paddingClasses[padding]} ${radiusClasses[radius]} ${className}`}
    >
      {children}
    </div>
  );
}
