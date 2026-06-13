import React, { ReactNode } from 'react';
import { FORTRESS, alpha } from '@/lib/fortress';

export const Toggle = ({
  on,
  onClick,
  accent = FORTRESS.green,
  'aria-label': ariaLabel,
}: {
  on: boolean;
  onClick: () => void;
  accent?: string;
  'aria-label'?: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={ariaLabel}
    onClick={onClick}
    className="relative h-[18px] w-9 flex-none rounded-full border transition-colors fortress-focus"
    style={{
      borderColor: on ? accent : FORTRESS.border,
      background: on ? alpha(accent, 0.15) : FORTRESS.surfaceSunken,
    }}
  >
    <span
      className="absolute top-[2px] h-3 w-3 rounded-full transition-all"
      style={{ left: on ? 20 : 2, background: on ? accent : '#3A4A41' }}
    />
  </button>
);

export const SettingRow = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) => (
  <div
    className="flex items-center gap-3 rounded-sm border px-3 py-2.5"
    style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceRaised }}
  >
    <div className="min-w-0 flex-1">
      <div className="font-mono text-[9px] font-bold uppercase tracking-wide" style={{ color: FORTRESS.text }}>
        {title}
      </div>
      <div className="mt-0.5 font-mono text-[7px] leading-relaxed tracking-wide" style={{ color: FORTRESS.textDim }}>
        {desc}
      </div>
    </div>
    {children}
  </div>
);

export const Chip = ({
  label,
  active,
  accent = FORTRESS.green,
  onClick,
}: {
  label: string;
  active: boolean;
  accent?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-sm px-2.5 py-1.5 font-mono text-[8px] font-extrabold uppercase tracking-wide transition-colors fortress-focus"
    style={{
      background: active ? alpha(accent, 0.12) : 'transparent',
      border: `1px solid ${active ? accent : FORTRESS.border}`,
      color: active ? accent : FORTRESS.textMuted,
    }}
  >
    {label}
  </button>
);

export const SectionDivider = ({ children }: { children: ReactNode }) => (
  <div className="mb-2 flex items-center gap-2.5">
    <span
      className="font-mono text-[8px] font-extrabold uppercase tracking-[0.2em]"
      style={{ color: FORTRESS.textDim }}
    >
      {children}
    </span>
    <div className="h-px flex-1" style={{ background: FORTRESS.border }} />
  </div>
);
