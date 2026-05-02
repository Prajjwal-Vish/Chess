import { type ReactNode } from 'react';

interface SegmentedRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Flex row where every child gets flex-1 and 0.5px vertical dividers appear
 * between siblings. Used for action pairs (Play a friend / Play computer) and
 * stats rows. Overflow is clipped so children inherit the panel border-radius.
 */
export function SegmentedRow({ children, className = '' }: SegmentedRowProps) {
  return (
    <div
      className={`flex bg-bg-panel border-half border-border-default rounded-panel overflow-hidden divide-x-half [&>*]:flex-1 ${className}`}
    >
      {children}
    </div>
  );
}
