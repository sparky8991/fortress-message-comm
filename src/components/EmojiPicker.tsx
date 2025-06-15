
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
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div className="absolute bottom-full right-0 mb-2 bg-gray-700 border border-gray-600 rounded-lg p-3 shadow-lg z-[101] w-64">
        <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
              className="text-lg hover:bg-gray-600 rounded p-1 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
