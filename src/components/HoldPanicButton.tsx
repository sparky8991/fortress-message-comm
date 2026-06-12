import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, Shield, Loader2 } from 'lucide-react';
import { auth, db } from '@/integrations/firebase/client';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

const HOLD_DURATION = 3000; // 3 seconds to activate

interface HoldPanicButtonProps {
  variant?: 'compact' | 'full';
  onWipeComplete?: () => void;
}

export const HoldPanicButton = ({ variant = 'full', onWipeComplete }: HoldPanicButtonProps) => {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeProgress, setWipeProgress] = useState(0);
  const [wipeStatus, setWipeStatus] = useState('');

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const executeWipe = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsWiping(true);
    setWipeProgress(0);

    try {
      // Step 1: Delete all direct messages
      setWipeStatus('Wiping messages...');
      setWipeProgress(10);
      const messagesRef = collection(db, 'direct_messages');
      const myMessagesQuery = query(messagesRef, where('sender_id', '==', user.uid));
      const messagesSnap = await getDocs(myMessagesQuery);
      for (const msgDoc of messagesSnap.docs) {
        await deleteDoc(doc(db, 'direct_messages', msgDoc.id));
      }
      setWipeProgress(30);

      // Step 2: Delete conversation participations
      setWipeStatus('Removing conversations...');
      const participantsRef = collection(db, 'conversation_participants');
      const myParticipationsQuery = query(participantsRef, where('user_id', '==', user.uid));
      const participationsSnap = await getDocs(myParticipationsQuery);
      for (const partDoc of participationsSnap.docs) {
        await deleteDoc(doc(db, 'conversation_participants', partDoc.id));
      }
      setWipeProgress(50);

      // Step 3: Delete typing indicators
      setWipeStatus('Clearing activity traces...');
      const typingRef = collection(db, 'typing_indicators');
      const typingSnap = await getDocs(typingRef);
      for (const typingDoc of typingSnap.docs) {
        const data = typingDoc.data();
        if (data[user.uid]) {
          await deleteDoc(doc(db, 'typing_indicators', typingDoc.id));
        }
      }
      setWipeProgress(60);

      // Step 4: Delete team memberships
      setWipeStatus('Leaving teams...');
      const membersRef = collection(db, 'team_members');
      const myMembershipsQuery = query(membersRef, where('user_id', '==', user.uid));
      const membershipsSnap = await getDocs(myMembershipsQuery);
      for (const memberDoc of membershipsSnap.docs) {
        await deleteDoc(doc(db, 'team_members', memberDoc.id));
      }
      setWipeProgress(70);

      // Step 5: Clear local storage
      setWipeStatus('Clearing local data...');
      localStorage.clear();
      sessionStorage.clear();
      setWipeProgress(85);

      // Step 6: Sign out
      setWipeStatus('Signing out...');
      await signOut(auth);
      setWipeProgress(100);

      setWipeStatus('Wipe complete');
      onWipeComplete?.();

      // Redirect after a brief pause
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);

    } catch (error) {
      console.error('Error during panic wipe:', error);
      setWipeStatus('Error during wipe. Please try again.');
      setIsWiping(false);
    }
  }, [onWipeComplete]);

  const startHold = useCallback(() => {
    setIsHolding(true);
    startTimeRef.current = Date.now();

    // Update progress every 50ms for smooth animation
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);
    }, 50);

    // Trigger wipe after hold duration
    holdTimerRef.current = setTimeout(() => {
      setHoldProgress(100);
      setIsHolding(false);
      executeWipe();
    }, HOLD_DURATION);
  }, [executeWipe]);

  const cancelHold = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startHold();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isWiping) cancelHold();
  };

  // Emergency data removal progress overlay
  if (isWiping) {
    return (
      <div className="fixed inset-0 bg-red-900/95 z-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">EMERGENCY WIPE IN PROGRESS</h2>
          <p className="text-red-300 mb-6">{wipeStatus}</p>

          <div className="w-64 h-2 bg-red-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${wipeProgress}%` }}
            />
          </div>

          <p className="text-red-400 text-sm">{wipeProgress}% Complete</p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            <span className="text-red-300 text-sm">Do not close this window</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative p-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 transition-all group overflow-hidden"
        title="Hold 3 seconds to activate Panic Mode"
      >
        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            className="stroke-red-800"
            fill="none"
            strokeWidth="2"
            cx="18"
            cy="18"
            r="16"
          />
          <circle
            className="stroke-red-500 transition-all"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${holdProgress}, 100`}
            cx="18"
            cy="18"
            r="16"
          />
        </svg>

        <AlertTriangle className={`w-5 h-5 text-red-500 relative z-10 ${isHolding ? 'animate-pulse' : ''}`} />

        {isHolding && (
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-red-400 whitespace-nowrap">
            Hold {Math.ceil((HOLD_DURATION - (HOLD_DURATION * holdProgress / 100)) / 1000)}s
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`
          relative w-full py-4 px-6 rounded-xl font-semibold text-white
          bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800
          transition-all duration-200 overflow-hidden
          ${isHolding ? 'scale-[0.98] shadow-lg shadow-red-500/30' : 'shadow-md'}
        `}
      >
        {/* Progress bar overlay */}
        <div
          className="absolute inset-0 bg-red-400/30 transition-all duration-50"
          style={{ width: `${holdProgress}%` }}
        />

        <div className="relative z-10 flex items-center justify-center gap-3">
          <AlertTriangle className={`w-5 h-5 ${isHolding ? 'animate-pulse' : ''}`} />
          <span>
            {isHolding
              ? `Hold ${Math.ceil((HOLD_DURATION - (HOLD_DURATION * holdProgress / 100)) / 1000)}s...`
              : 'Hold to Panic Wipe'
            }
          </span>
          <Trash2 className="w-5 h-5" />
        </div>
      </button>

      <p className="text-xs text-gray-500 text-center">
        Hold the button for 3 seconds to wipe all data
      </p>
    </div>
  );
};
