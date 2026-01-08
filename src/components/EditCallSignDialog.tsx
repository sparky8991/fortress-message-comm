import React, { useState, useEffect } from 'react';
import { auth, db } from '@/integrations/firebase/client';
import { doc, updateDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2, UserCheck, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditCallSignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentCallSign: string;
  onCallSignUpdated: (newCallSign: string) => void;
}

interface CallSignChangeHistory {
  lastChangeDate: string | null;
  changesThisYear: number;
  yearOfChanges: number;
}

export const EditCallSignDialog = ({
  isOpen,
  onClose,
  currentCallSign,
  onCallSignUpdated
}: EditCallSignDialogProps) => {
  const [newCallSign, setNewCallSign] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changeHistory, setChangeHistory] = useState<CallSignChangeHistory | null>(null);
  const [canChange, setCanChange] = useState(true);
  const [changeRestrictionMessage, setChangeRestrictionMessage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setNewCallSign(currentCallSign);
      setError(null);
      checkChangeEligibility();
    }
  }, [isOpen, currentCallSign]);

  const checkChangeEligibility = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        const currentYear = new Date().getFullYear();

        const history: CallSignChangeHistory = {
          lastChangeDate: data.callSignLastChanged || null,
          changesThisYear: data.callSignChangesThisYear || 0,
          yearOfChanges: data.callSignChangeYear || currentYear
        };

        // Reset yearly count if it's a new year
        if (history.yearOfChanges !== currentYear) {
          history.changesThisYear = 0;
          history.yearOfChanges = currentYear;
        }

        setChangeHistory(history);

        // Check monthly limit
        if (history.lastChangeDate) {
          const lastChange = new Date(history.lastChangeDate);
          const now = new Date();
          const daysSinceLastChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceLastChange < 30) {
            const daysRemaining = 30 - daysSinceLastChange;
            setCanChange(false);
            setChangeRestrictionMessage(`You can only change your call sign once per month. Please wait ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'}.`);
            return;
          }
        }

        // Check yearly limit
        if (history.changesThisYear >= 3) {
          setCanChange(false);
          setChangeRestrictionMessage('You have reached the maximum of 3 call sign changes for this year.');
          return;
        }

        setCanChange(true);
        setChangeRestrictionMessage(null);
      }
    } catch (err) {
      console.error('Error checking change eligibility:', err);
    }
  };

  const validateCallSign = (callSign: string) => {
    if (!callSign.trim()) {
      return "Call sign is required";
    }
    if (callSign.trim().length < 2) {
      return "Call sign must be at least 2 characters";
    }
    if (callSign.trim().length > 20) {
      return "Call sign must be 20 characters or less";
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(callSign.trim())) {
      return "Call sign can only contain letters, numbers, underscores, and hyphens";
    }
    return null;
  };

  const checkUniqueness = async (callSign: string): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;

    const profilesRef = collection(db, 'profiles');
    const q = query(profilesRef, where('callSign', '==', callSign.trim()));
    const snapshot = await getDocs(q);

    // Check if any result belongs to a different user
    for (const doc of snapshot.docs) {
      if (doc.id !== user.uid) {
        return false; // Call sign is taken by another user
      }
    }
    return true; // Call sign is available (or belongs to current user)
  };

  const handleSave = async () => {
    const validationError = validateCallSign(newCallSign);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newCallSign.trim().toLowerCase() === currentCallSign.toLowerCase()) {
      onClose();
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in to change your call sign.');
      return;
    }

    setChecking(true);
    setError(null);

    try {
      // Check uniqueness
      const isUnique = await checkUniqueness(newCallSign);
      if (!isUnique) {
        setError('This call sign is already taken. Please choose a different one.');
        setChecking(false);
        return;
      }

      setChecking(false);
      setSaving(true);

      const currentYear = new Date().getFullYear();
      const newChangesThisYear = (changeHistory?.yearOfChanges === currentYear ? changeHistory.changesThisYear : 0) + 1;

      // Update the profile
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        callSign: newCallSign.trim(),
        callSignLower: newCallSign.trim().toLowerCase(),
        callSignLastChanged: new Date().toISOString(),
        callSignChangesThisYear: newChangesThisYear,
        callSignChangeYear: currentYear
      });

      toast({
        title: "Call Sign Updated",
        description: `Your call sign has been changed to "${newCallSign.trim()}".`,
      });

      onCallSignUpdated(newCallSign.trim());
      onClose();
    } catch (err: any) {
      console.error('Error updating call sign:', err);
      setError('Failed to update call sign. Please try again.');
    } finally {
      setSaving(false);
      setChecking(false);
    }
  };

  const remainingChanges = changeHistory ? 3 - changeHistory.changesThisYear : 3;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-500" />
            Edit Call Sign
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Your call sign is how others identify you in SecureChat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Warning about limits */}
          <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-yellow-400 font-medium">Change Limits</p>
                <ul className="text-yellow-300/80 text-xs mt-1 space-y-1">
                  <li>You can only change your call sign once per month</li>
                  <li>Maximum 3 changes per year</li>
                  <li className="font-medium">
                    Changes remaining this year: {remainingChanges}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Restriction message if they can't change */}
          {!canChange && changeRestrictionMessage && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{changeRestrictionMessage}</p>
              </div>
            </div>
          )}

          {/* Input field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Call Sign
            </label>
            <Input
              type="text"
              value={newCallSign}
              onChange={(e) => {
                setNewCallSign(e.target.value);
                setError(null);
              }}
              placeholder="Enter new call sign"
              className="bg-gray-700 border-gray-600 text-white"
              disabled={!canChange || saving || checking}
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              2-20 characters. Letters, numbers, underscores, and hyphens only.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canChange || saving || checking || newCallSign.trim() === currentCallSign}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
