import React, { useEffect, useState } from 'react';
import { Flame, Timer, Eye } from 'lucide-react';
import { db } from '@/integrations/firebase/client';
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface SelfDestructTimerProps {
  messageId: string;
  selfDestructAt?: string | null;
  selfDestructAfterRead?: number | null; // seconds after read
  readAt?: string | null;
  isOwnMessage?: boolean;
}

export const SelfDestructTimer = ({
  messageId,
  selfDestructAt,
  selfDestructAfterRead,
  readAt,
  isOwnMessage = false
}: SelfDestructTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isDestroying, setIsDestroying] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      let targetTime: number | null = null;

      if (selfDestructAt) {
        targetTime = new Date(selfDestructAt).getTime();
      } else if (selfDestructAfterRead && readAt) {
        targetTime = new Date(readAt).getTime() + (selfDestructAfterRead * 1000);
      }

      if (targetTime) {
        const remaining = Math.max(0, targetTime - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));

        if (remaining <= 0) {
          destroyMessage();
        }
      }
    };

    const destroyMessage = async () => {
      setIsDestroying(true);
      try {
        const messageRef = doc(db, 'direct_messages', messageId);
        await deleteDoc(messageRef);
      } catch (error) {
        console.error('Error destroying message:', error);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [messageId, selfDestructAt, selfDestructAfterRead, readAt]);

  if (isDestroying) {
    return (
      <div className="flex items-center gap-1 text-orange-500 animate-pulse">
        <Flame className="w-3 h-3" />
        <span className="ft-meta font-mono">DESTROYING...</span>
      </div>
    );
  }

  if (timeLeft === null) return null;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const isUrgent = timeLeft <= 10;

  return (
    <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-orange-400'}`}>
      {selfDestructAfterRead && !readAt ? (
        <>
          <Eye className="w-3 h-3" />
          <span className="ft-meta font-mono">{selfDestructAfterRead}s after read</span>
        </>
      ) : (
        <>
          <Timer className="w-3 h-3" />
          <span className="ft-meta font-mono">{formatTime(timeLeft)}</span>
        </>
      )}
    </div>
  );
};

// Self-destruct options for message input
export const SELF_DESTRUCT_OPTIONS = [
  { label: 'Off', value: null },
  { label: '5 seconds', value: 5 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86400 },
];

export const SELF_DESTRUCT_AFTER_READ_OPTIONS = [
  { label: 'Off', value: null },
  { label: '5 seconds after read', value: 5 },
  { label: '10 seconds after read', value: 10 },
  { label: '30 seconds after read', value: 30 },
  { label: '1 minute after read', value: 60 },
];
