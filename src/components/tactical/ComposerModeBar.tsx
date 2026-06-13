import React from 'react';
import { Flame } from 'lucide-react';
import { TacticalTooltip } from './TacticalTooltip';
import { FORTRESS, MARK_IDLE_CLASS, MARK_META, type TrafficMark } from '@/lib/fortress';

interface ComposerModeBarProps {
  messageMark: TrafficMark;
  onSelectMark: (mark: Exclude<TrafficMark, 'locked'>) => void;
  onLockedSelect: () => void;
  burnEnabled: boolean;
  onToggleBurn: () => void;
}

const ORDER: TrafficMark[] = ['normal', 'sensitive', 'locked'];

export const ComposerModeBar = ({
  messageMark,
  onSelectMark,
  onLockedSelect,
  burnEnabled,
  onToggleBurn,
}: ComposerModeBarProps) => (
  <div className="flex flex-wrap items-center gap-2 px-1">
    <span className="fortress-command">Mark</span>

    {ORDER.map((key) => {
      const meta = MARK_META[key];

      return (
        <TacticalTooltip key={key} title={meta.tipTitle} body={meta.tipBody} accent={meta.accent}>
          <button
            type="button"
            onClick={() => (key === 'locked' ? onLockedSelect() : onSelectMark(key as Exclude<TrafficMark, 'locked'>))}
            aria-pressed={messageMark === key}
            className={`fortress-focus rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
              messageMark === key ? meta.onClass : MARK_IDLE_CLASS
            }`}
          >
            {meta.label}
          </button>
        </TacticalTooltip>
      );
    })}

    <TacticalTooltip
      title="Burn timer"
      body="When on, the sent message deletes for both users 2 minutes after it is opened."
      accent={FORTRESS.orange}
      width={240}
    >
      <button
        type="button"
        onClick={onToggleBurn}
        aria-pressed={burnEnabled}
        title="Burn after read: 2 minutes"
        className={`fortress-focus rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
          burnEnabled
            ? 'border-orange-400/70 bg-orange-500/15 text-orange-300'
            : 'border-green-500/20 text-green-500/45 hover:border-orange-500/50 hover:text-orange-300'
        }`}
      >
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3 w-3" />
          Burn: {burnEnabled ? '2 min' : 'off'}
        </span>
      </button>
    </TacticalTooltip>
  </div>
);

export default ComposerModeBar;
