
import React from 'react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
  '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
  '✨', '🎉', '🎊', '🔥', '💯', '⭐', '🌟', '💫', '⚡', '☄️'
];

export const EmojiPicker = ({ onEmojiSelect, isOpen, onClose }: EmojiPickerProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[50]" onClick={onClose} />
      <div className="absolute bottom-full right-0 z-[60] mb-2 w-64 border border-[#1E5C3C] bg-[#0C120F]/98 p-3 font-mono text-[#DCEAE1] shadow-[0_0_35px_rgba(0,0,0,0.55)] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#ECF7F0]">Emoji Relay</h3>
          <button
            type="button"
            onClick={onClose}
            className="fortress-focus px-1 py-0.5 font-mono text-[10px] text-[#76897D] hover:bg-[#36E27B]/10 hover:text-[#DCEAE1]"
            aria-label="Close emoji picker"
          >
            ✕
          </button>
        </div>
        <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto scrollbar-thin scrollbar-track-[#070B09] scrollbar-thumb-[#1E5C3C]">
          {emojis.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
              className="fortress-focus flex min-h-[30px] items-center justify-center rounded-sm border border-transparent p-1.5 ft-body transition-all duration-200 hover:scale-105 hover:border-[#1E5C3C] hover:bg-[#36E27B]/10 active:scale-95"
              aria-label={`Insert ${emoji} emoji`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
