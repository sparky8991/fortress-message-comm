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
    } catch (err: unknown) {
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
      <DialogContent className="max-w-[460px] rounded-sm border-[#1E5C3C] bg-[#0C120F] p-0 font-mono text-[#DCEAE1] shadow-[0_0_50px_rgba(0,0,0,0.55)]">
        <DialogHeader>
          <div className="border-b border-[#1C2B22] px-4 py-3">
            <DialogTitle className="flex items-center gap-2 font-mono text-[12px] font-black uppercase tracking-[0.18em] text-[#36E27B]">
              <UserCheck className="h-4 w-4" />
              Change Call Sign
            </DialogTitle>
          </div>
          <DialogDescription className="px-4 pt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[#76897D]">
            Your call sign is the operator handle other users see inside SecureChat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4 pb-4 pt-3">
          <div className="border border-[#6B4B18] bg-[#1A1507] p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F2B43C]" />
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#F2B43C]">
                  Change limits
                </p>
                <ul className="mt-2 space-y-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-[#FFE0A8]/75">
                  <li>Once per month</li>
                  <li>Maximum 3 changes per year</li>
                  <li className="text-[#FFE0A8]">Changes remaining this year: {remainingChanges}</li>
                </ul>
              </div>
            </div>
          </div>

          {!canChange && changeRestrictionMessage && (
            <div className="border border-[#5C2420] bg-[#8C1D18]/20 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FF6B61]" />
                <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-[#FFE0DC]/85">
                  {changeRestrictionMessage}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#76897D]">
              New call sign
            </label>
            <Input
              type="text"
              value={newCallSign}
              onChange={(e) => {
                setNewCallSign(e.target.value);
                setError(null);
              }}
              placeholder="ENTER CALL SIGN"
              className="h-10 rounded-sm border-[#1C2B22] bg-[#070B09] font-mono text-[13px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]"
              disabled={!canChange || saving || checking}
              maxLength={20}
            />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#76897D]">
              2-20 characters - letters, numbers, underscores, and hyphens only.
            </p>
          </div>

          {error && (
            <div className="border border-[#5C2420] bg-[#8C1D18]/20 p-3">
              <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-[#FF6B61]">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[#1C2B22] pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 rounded-sm border-[#1C2B22] bg-transparent px-4 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#76897D] hover:border-[#1E5C3C] hover:bg-[#36E27B]/10 hover:text-[#DCEAE1]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canChange || saving || checking || newCallSign.trim() === currentCallSign}
              className="h-9 rounded-sm bg-[#36E27B] px-4 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#06130B] hover:bg-[#7BEFA9]"
            >
              {checking ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Checking
                </>
              ) : saving ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
