import React, { useEffect, useMemo, useState } from 'react';
import { deleteDoc, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { Eye, Flame, Timer } from 'lucide-react';
import { auth, db } from '@/integrations/firebase/client';
import { Message } from '@/constants/initialMessages';
import {
  BURN_AFTER_READ_SECONDS,
  getBurnTimeLeftSeconds,
  isBurnAfterRead,
  isBurnExpired,
  isBurnUnread,
  toDate,
} from '@/utils/burnAfterRead.js';

interface BurnAfterReadMessageProps {
  message: Message;
  children: React.ReactNode;
}

const formatBurnTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

export const BurnAfterReadMessage = ({ message, children }: BurnAfterReadMessageProps) => {
  const metadata = message.metadata || {};
  const isBurnMessage = isBurnAfterRead(metadata);
  const isOwnMessage = message.sender === 'me';
  const [isOpening, setIsOpening] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const expiresAt = useMemo(() => toDate(metadata.burnExpiresAt), [metadata.burnExpiresAt]);
  const secondsLeft = getBurnTimeLeftSeconds(expiresAt, now);
  const isUnreadBurn = isBurnUnread(metadata);
  const shouldCoverMessage = isBurnMessage && !isOwnMessage && isUnreadBurn;
  const burnSeconds =
    typeof metadata.burnAfterReadSeconds === 'number'
      ? metadata.burnAfterReadSeconds
      : BURN_AFTER_READ_SECONDS;

  useEffect(() => {
    if (!isBurnMessage || !expiresAt) return undefined;

    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, isBurnMessage]);

  useEffect(() => {
    if (!isBurnMessage || !expiresAt || isDeleting || !isBurnExpired(expiresAt, now)) return;

    setIsDeleting(true);
    deleteDoc(doc(db, 'direct_messages', message.id)).catch((error) => {
      console.error('Failed to delete expired burn message:', error);
      setIsDeleting(false);
    });
  }, [expiresAt, isBurnMessage, isDeleting, message.id, now]);

  const openMessage = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const user = auth.currentUser;
    if (!user || isOpening || !isBurnMessage || !isUnreadBurn) return;

    setIsOpening(true);
    try {
      const openedAt = new Date();
      const burnExpiresAt = new Date(openedAt.getTime() + burnSeconds * 1000);
      await updateDoc(doc(db, 'direct_messages', message.id), {
        'metadata.burnOpenedAt': serverTimestamp(),
        'metadata.burnExpiresAt': Timestamp.fromDate(burnExpiresAt),
        'metadata.burnOpenedBy': user.uid,
      });
    } catch (error) {
      console.error('Failed to open burn-after-read message:', error);
    } finally {
      setIsOpening(false);
    }
  };

  if (!isBurnMessage) {
    return <>{children}</>;
  }

  if (isDeleting) {
    return (
      <div className="flex items-center gap-2 text-orange-300 font-mono text-xs animate-pulse">
        <Flame className="w-4 h-4" />
        BURNING MESSAGE...
      </div>
    );
  }

  if (shouldCoverMessage) {
    return (
      <div className="rounded-lg border border-orange-500/50 bg-black/80 p-3 shadow-lg shadow-orange-500/10">
        <div className="flex items-center gap-2 text-orange-300 font-mono text-xs font-semibold">
          <Flame className="w-4 h-4" />
          BURN AFTER READ
        </div>
        <p className="mt-2 text-xs text-gray-300 font-mono">
          This secure message will delete {formatBurnTime(burnSeconds)} after opening.
        </p>
        <button
          type="button"
          onClick={openMessage}
          disabled={isOpening}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-orange-500/50 bg-orange-500/15 px-3 py-2 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/25 disabled:opacity-60"
        >
          <Eye className="w-4 h-4" />
          {isOpening ? 'OPENING...' : 'OPEN SECURE MESSAGE'}
        </button>
      </div>
    );
  }

  return (
    <>
      {children}
      <div className="mt-2 flex items-center gap-2 text-xs font-mono text-orange-300">
        {expiresAt && secondsLeft !== null ? (
          <>
            <Timer className="w-3 h-3" />
            Burns in {formatBurnTime(secondsLeft)}
          </>
        ) : (
          <>
            <Flame className="w-3 h-3" />
            {isOwnMessage ? 'Waiting for recipient to open' : `Burns ${formatBurnTime(burnSeconds)} after opening`}
          </>
        )}
      </div>
    </>
  );
};
