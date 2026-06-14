import React, { ReactNode } from 'react';
import { FORTRESS } from '@/lib/fortress';

interface TacticalTooltipProps {
  title: string;
  body: string;
  accent?: string;
  width?: number;
  children: ReactNode;
}

export const TacticalTooltip = ({
  title,
  body,
  accent = FORTRESS.green,
  width = 230,
  children,
}: TacticalTooltipProps) => (
  <span className="group relative inline-flex">
    {children}
    <span
      role="tooltip"
      className="pointer-events-none invisible absolute bottom-[calc(100%+9px)] left-1/2 z-50 -translate-x-1/2 rounded-sm border px-3 py-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
      style={{ width, borderColor: accent, background: '#0F1A14' }}
    >
      <span className="block font-mono text-[10px] font-extrabold uppercase tracking-[0.15em]" style={{ color: accent }}>
        {title}
      </span>
      <span className="mt-1 block font-mono text-[10px] leading-relaxed tracking-wide" style={{ color: '#9FB2A6' }}>
        {body}
      </span>
      <span
        className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent"
        style={{ borderTopColor: accent }}
      />
    </span>
  </span>
);

export default TacticalTooltip;
