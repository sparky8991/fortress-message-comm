import React, { useState } from 'react';
import { AlertTriangle, Trash2, Shield, Loader2 } from 'lucide-react';
import { auth, db } from '@/integrations/firebase/client';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PanicModeProps {
  onComplete?: () => void;
}

export const PanicMode = ({ onComplete }: PanicModeProps) => {
  const [isWiping, setIsWiping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const executeWipe = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsWiping(true);
    setProgress(0);

    try {
      // Step 1: Delete all direct messages
      setStatus('Wiping messages...');
      setProgress(10);
      const messagesRef = collection(db, 'direct_messages');
      const myMessagesQuery = query(messagesRef, where('sender_id', '==', user.uid));
      const messagesSnap = await getDocs(myMessagesQuery);
      for (const msgDoc of messagesSnap.docs) {
        await deleteDoc(doc(db, 'direct_messages', msgDoc.id));
      }
      setProgress(30);

      // Step 2: Delete conversation participations
      setStatus('Removing conversations...');
      const participantsRef = collection(db, 'conversation_participants');
      const myParticipationsQuery = query(participantsRef, where('user_id', '==', user.uid));
      const participationsSnap = await getDocs(myParticipationsQuery);
      for (const partDoc of participationsSnap.docs) {
        await deleteDoc(doc(db, 'conversation_participants', partDoc.id));
      }
      setProgress(50);

      // Step 3: Delete typing indicators
      setStatus('Clearing activity traces...');
      const typingRef = collection(db, 'typing_indicators');
      const typingSnap = await getDocs(typingRef);
      for (const typingDoc of typingSnap.docs) {
        const data = typingDoc.data();
        if (data[user.uid]) {
          await deleteDoc(doc(db, 'typing_indicators', typingDoc.id));
        }
      }
      setProgress(60);

      // Step 4: Delete team memberships
      setStatus('Leaving teams...');
      const membersRef = collection(db, 'team_members');
      const myMembershipsQuery = query(membersRef, where('user_id', '==', user.uid));
      const membershipsSnap = await getDocs(myMembershipsQuery);
      for (const memberDoc of membershipsSnap.docs) {
        await deleteDoc(doc(db, 'team_members', memberDoc.id));
      }
      setProgress(70);

      // Step 5: Clear local storage
      setStatus('Clearing local data...');
      localStorage.clear();
      sessionStorage.clear();
      setProgress(85);

      // Step 6: Sign out
      setStatus('Signing out...');
      await signOut(auth);
      setProgress(100);

      setStatus('Wipe complete');

      // Redirect after a brief pause
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);

    } catch (error) {
      console.error('Error during panic wipe:', error);
      setStatus('Error during wipe. Please try again.');
    }

    onComplete?.();
  };

  if (isWiping) {
    return (
      <div className="fixed inset-0 bg-red-900/95 z-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4 animate-pulse" />
          <h2 className="ft-head font-bold text-white mb-2">EMERGENCY WIPE IN PROGRESS</h2>
          <p className="text-red-300 mb-6">{status}</p>

          <div className="w-64 h-2 bg-red-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-red-400 ft-body">{progress}% Complete</p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            <span className="text-red-300 ft-body">Do not close this window</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Panic Button Component
interface PanicButtonProps {
  variant?: 'icon' | 'full';
}

export const PanicButton = ({ variant = 'full' }: PanicButtonProps) => {
  const [showPanic, setShowPanic] = useState(false);

  const handlePanic = () => {
    setShowPanic(true);
  };

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {variant === 'icon' ? (
            <button className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 transition-colors">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </button>
          ) : (
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Panic Mode
            </Button>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-gray-900 border-red-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              EMERGENCY WIPE
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This will immediately and permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1 text-red-300">
                <li>All your messages</li>
                <li>All conversation history</li>
                <li>All team memberships</li>
                <li>All local data</li>
              </ul>
              <p className="mt-3 text-red-400 font-semibold">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePanic}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              WIPE EVERYTHING
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showPanic && <PanicMode />}
    </>
  );
};
