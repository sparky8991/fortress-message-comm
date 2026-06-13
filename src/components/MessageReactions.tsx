import React, { useState } from 'react';
import { Smile, Plus } from 'lucide-react';
import { auth, db } from '@/integrations/firebase/client';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Reaction {
  emoji: string;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onReactionChange?: () => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎯'];

export const MessageReactions = ({ messageId, reactions = [], onReactionChange }: MessageReactionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const user = auth.currentUser;

  const handleReaction = async (emoji: string) => {
    if (!user) return;

    try {
      const messageRef = doc(db, 'direct_messages', messageId);

      // Check if user already reacted with this emoji
      const existingReaction = reactions.find(r => r.emoji === emoji);
      const hasReacted = existingReaction?.users.includes(user.uid);

      if (hasReacted) {
        // Remove reaction
        const updatedUsers = existingReaction!.users.filter(u => u !== user.uid);
        if (updatedUsers.length === 0) {
          // Remove the entire reaction
          await updateDoc(messageRef, {
            reactions: reactions.filter(r => r.emoji !== emoji)
          });
        } else {
          // Update the users list
          await updateDoc(messageRef, {
            reactions: reactions.map(r =>
              r.emoji === emoji ? { ...r, users: updatedUsers } : r
            )
          });
        }
      } else {
        // Add reaction
        if (existingReaction) {
          // Add user to existing reaction
          await updateDoc(messageRef, {
            reactions: reactions.map(r =>
              r.emoji === emoji ? { ...r, users: [...r.users, user.uid] } : r
            )
          });
        } else {
          // Create new reaction
          await updateDoc(messageRef, {
            reactions: [...reactions, { emoji, users: [user.uid] }]
          });
        }
      }

      setIsOpen(false);
      onReactionChange?.();
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const hasUserReacted = (emoji: string) => {
    if (!user) return false;
    const reaction = reactions.find(r => r.emoji === emoji);
    return reaction?.users.includes(user.uid) || false;
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReaction(reaction.emoji)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ft-meta transition-all ${
            hasUserReacted(reaction.emoji)
              ? 'bg-green-500/30 border border-green-500/50'
              : 'bg-gray-700/50 border border-gray-600/50 hover:bg-gray-600/50'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span className="text-gray-300 font-mono">{reaction.users.length}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="p-1 rounded-full text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-colors opacity-0 group-hover:opacity-100">
            <Plus className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-gray-800 border-gray-700" align="start">
          <div className="flex gap-1 flex-wrap max-w-[200px]">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`p-1.5 rounded hover:bg-gray-700 transition-colors ft-head ${
                  hasUserReacted(emoji) ? 'bg-green-500/20' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
