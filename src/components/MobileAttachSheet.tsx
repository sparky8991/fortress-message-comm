/**
 * MobileAttachSheet.tsx — bottom sheet for the mobile composer's "+" action.
 *
 * Replaces the cramped inline attach/mic/gif icon row on phones with big tap targets
 * (design frame 03 of the mobile mockup). It only renders the UI + fires callbacks;
 * the actual handlers (file picker, voice recorder, GIF picker) live in MessageInput,
 * so all existing functionality is preserved.
 */
import React from 'react';
import { Image as ImageIcon, FileText, Mic, X } from 'lucide-react';
import { FORTRESS } from '@/lib/fortress';

interface MobileAttachSheetProps {
  open: boolean;
  onClose: () => void;
  onPhoto: () => void;
  onFile: () => void;
  onVoice: () => void;
  onGif: () => void;
}

export const MobileAttachSheet = ({ open, onClose, onPhoto, onFile, onVoice, onGif }: MobileAttachSheetProps) => {
  if (!open) return null;

  const options = [
    { key: 'photo', label: 'PHOTO', icon: <ImageIcon className="h-6 w-6" />, onClick: onPhoto },
    { key: 'file', label: 'FILE', icon: <FileText className="h-6 w-6" />, onClick: onFile },
    { key: 'voice', label: 'VOICE', icon: <Mic className="h-6 w-6" />, onClick: onVoice },
    { key: 'gif', label: 'GIF', icon: <span className="font-mono text-[13px] font-extrabold tracking-[1px]">GIF</span>, onClick: onGif },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative animate-in slide-in-from-bottom rounded-t-2xl border-t px-4 pt-3 duration-200"
        style={{
          background: FORTRESS.surface,
          borderColor: FORTRESS.borderGreen,
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full" style={{ background: FORTRESS.border }} />
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: FORTRESS.textDim }}>
            Send encrypted attachment
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-sm text-[#76897D] transition-colors hover:text-[#ECF7F0]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3 pb-1">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                o.onClick();
                onClose();
              }}
              className="flex flex-col items-center gap-2"
            >
              <span
                className="grid h-[60px] w-full place-items-center rounded-2xl border text-[#36E27B] transition-transform active:scale-95"
                style={{ borderColor: FORTRESS.borderGreen, background: 'rgba(54,226,123,0.08)' }}
              >
                {o.icon}
              </span>
              <span className="font-mono text-[9px] font-bold tracking-[0.5px]" style={{ color: FORTRESS.textDim }}>
                {o.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileAttachSheet;
