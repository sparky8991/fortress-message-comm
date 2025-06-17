
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
      <div className="absolute bottom-full right-0 mb-2 bg-gray-800/98 backdrop-blur-sm border border-gray-600/80 rounded-lg p-3 shadow-2xl z-[60] w-64">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-200 font-mono">EMOJIS</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xs font-mono hover:bg-gray-700/50 px-1 py-0.5 rounded"
            aria-label="Close emoji picker"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-gray-600">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
              className="text-base hover:bg-gray-700/80 rounded p-1.5 transition-all duration-200 hover:scale-110 active:scale-95 min-h-[32px] flex items-center justify-center"
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
