import { useState } from 'react';
import { Undo2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface MessageRecallProps {
  messageId: string;
  collectionName: string;
  sentAt: Date;
  recallWindowMinutes?: number;
  onRecall?: () => void;
}

export const MessageRecall = ({
  messageId,
  collectionName,
  sentAt,
  recallWindowMinutes = 5,
  onRecall,
}: MessageRecallProps) => {
  const [isRecalling, setIsRecalling] = useState(false);

  const canRecall = () => {
    const now = new Date();
    const timeDiff = (now.getTime() - sentAt.getTime()) / 1000 / 60;
    return timeDiff <= recallWindowMinutes;
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const timeDiff = (now.getTime() - sentAt.getTime()) / 1000 / 60;
    const remaining = recallWindowMinutes - timeDiff;

    if (remaining <= 0) return null;

    if (remaining < 1) {
      return `${Math.ceil(remaining * 60)}s`;
    }
    return `${Math.ceil(remaining)}m`;
  };

  const recallMessage = async () => {
    if (!canRecall()) {
      toast.error('Recall window has expired');
      return;
    }

    setIsRecalling(true);
    try {
      const messageRef = doc(db, collectionName, messageId);

      // Mark message as recalled (soft delete)
      await updateDoc(messageRef, {
        recalled: true,
        recalledAt: serverTimestamp(),
        content: '[Message recalled]',
        originalContent: null, // Don't store original for security
      });

      toast.success('Message recalled successfully');
      onRecall?.();
    } catch (error) {
      toast.error('Failed to recall message');
      console.error('Recall error:', error);
    } finally {
      setIsRecalling(false);
    }
  };

  const timeRemaining = getTimeRemaining();

  if (!canRecall()) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={recallMessage}
      disabled={isRecalling}
      className="h-6 px-2 ft-meta text-gray-400 hover:text-orange-400 hover:bg-orange-500/20"
    >
      <Undo2 className="w-3 h-3 mr-1" />
      {isRecalling ? 'Recalling...' : `Recall ${timeRemaining ? `(${timeRemaining})` : ''}`}
    </Button>
  );
};

// Hook for checking recall eligibility
export const useMessageRecall = (recallWindowMinutes: number = 5) => {
  const canRecallMessage = (sentAt: Date) => {
    const now = new Date();
    const timeDiff = (now.getTime() - sentAt.getTime()) / 1000 / 60;
    return timeDiff <= recallWindowMinutes;
  };

  const recallMessage = async (messageId: string, collectionName: string) => {
    try {
      const messageRef = doc(db, collectionName, messageId);
      await updateDoc(messageRef, {
        recalled: true,
        recalledAt: serverTimestamp(),
        content: '[Message recalled]',
      });
      return true;
    } catch (error) {
      console.error('Recall error:', error);
      return false;
    }
  };

  return { canRecallMessage, recallMessage };
};

// Recalled message indicator component
export const RecalledMessageIndicator = () => (
  <div className="flex items-center gap-2 text-gray-500 italic ft-body">
    <Undo2 className="w-4 h-4" />
    <span>This message was recalled</span>
  </div>
);

export default MessageRecall;
