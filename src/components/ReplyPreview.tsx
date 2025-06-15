
import React from 'react';
import { X, Reply } from 'lucide-react';

interface ReplyPreviewProps {
  replyingTo: {
    messageId: string;
    messageText: string;
    sender: string;
  } | null;
  onCancelReply: () => void;
}

export const ReplyPreview = ({ replyingTo, onCancelReply }: ReplyPreviewProps) => {
  if (!replyingTo) return null;

  return (
    <div className="bg-black/90 border-l-4 border-green-500 p-3 mx-3 mb-2 rounded-r-lg shadow-lg shadow-green-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <Reply className="w-4 h-4 text-green-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-green-400 font-medium font-mono">
              > REPLYING_TO: {replyingTo.sender}
            </p>
            <p className="text-sm text-gray-300 truncate font-mono">
              {replyingTo.messageText}
            </p>
          </div>
        </div>
        <button
          onClick={onCancelReply}
          className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-600 transition-colors flex-shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
