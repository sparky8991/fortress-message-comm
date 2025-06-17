
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
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div className="absolute bottom-full right-0 mb-3 bg-gray-800/95 backdrop-blur-sm border border-gray-600/60 rounded-xl p-4 shadow-2xl z-[9999] w-72">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-200 font-mono">EMOJI_SELECTION</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xs font-mono"
            aria-label="Close emoji picker"
          >
            [ESC]
          </button>
        </div>
        <div className="grid grid-cols-10 gap-2 max-h-56 overflow-y-auto scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-gray-600">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
              className="text-lg hover:bg-gray-700/80 rounded-lg p-2 transition-all duration-200 hover:scale-110 active:scale-95 min-h-[40px] flex items-center justify-center"
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
