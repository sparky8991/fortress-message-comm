import React, { useEffect, useState } from 'react';
import { auth, db } from '@/integrations/firebase/client';
import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface TypingIndicatorProps {
  conversationId: string;
  otherUserName?: string;
}

export const TypingIndicator = ({ conversationId, otherUserName = 'Someone' }: TypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!conversationId) return;

    // Listen for typing status
    const typingRef = doc(db, 'typing_indicators', conversationId);
    const unsubscribe = onSnapshot(typingRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const now = Date.now();
        // Filter out stale typing indicators (older than 5 seconds)
        const activeTypers = Object.entries(data)
          .filter(([key, value]: [string, any]) => {
            if (key === user?.uid) return false; // Don't show own typing
            const timestamp = value?.timestamp?.toMillis?.() || 0;
            return now - timestamp < 5000;
          })
          .map(([key, value]: [string, any]) => value.name || 'Someone');
        setTypingUsers(activeTypers);
      } else {
        setTypingUsers([]);
      }
    });

    return () => unsubscribe();
  }, [conversationId, user?.uid]);

  if (typingUsers.length === 0) return null;

  const typingText = typingUsers.length === 1
    ? `${typingUsers[0]} is typing`
    : typingUsers.length === 2
    ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
    : `${typingUsers.length} people are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-gray-400 text-sm">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="font-mono text-xs">{typingText}...</span>
    </div>
  );
};

// Hook to broadcast typing status
export const useTypingIndicator = (conversationId: string) => {
  const user = auth.currentUser;
  let typingTimeout: NodeJS.Timeout;

  const setTyping = async (isTyping: boolean, userName?: string) => {
    if (!user || !conversationId) return;

    try {
      const typingRef = doc(db, 'typing_indicators', conversationId);

      if (isTyping) {
        await setDoc(typingRef, {
          [user.uid]: {
            name: userName || 'Someone',
            timestamp: serverTimestamp()
          }
        }, { merge: true });

        // Auto-clear after 3 seconds
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          setTyping(false);
        }, 3000);
      } else {
        // Remove typing indicator
        await setDoc(typingRef, {
          [user.uid]: null
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  };

  return { setTyping };
};
