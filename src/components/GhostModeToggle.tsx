
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { auth, db } from '@/integrations/firebase/client';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Ghost, Eye, EyeOff } from 'lucide-react';

export const GhostModeToggle = () => {
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchGhostModeStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setIsGhostMode(profileSnap.data().ghostModeActive || false);
        }
      } catch (error: any) {
        const errorCode = "GHOST_MODE_FETCH_FAILED";
        console.error(`// ERROR_CODE: ${errorCode}\nError fetching ghost mode status:`, error);
        toast({
          title: "Error",
          description: `Could not load Ghost Mode status. (Code: ${errorCode})`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGhostModeStatus();
  }, [toast]);

  const toggleGhostMode = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const newGhostMode = !isGhostMode;

      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        ghostModeActive: newGhostMode,
        lastSeen: newGhostMode ? serverTimestamp() : null
      });

      setIsGhostMode(newGhostMode);
      toast({
        title: newGhostMode ? "Ghost Mode Activated" : "Ghost Mode Deactivated",
        description: newGhostMode
          ? "You appear offline to team members. You can still join ghost sessions."
          : "You're now visible to team members.",
      });
    } catch (error: any) {
      const errorCode = "GHOST_MODE_TOGGLE_FAILED";
      console.error(`// ERROR_CODE: ${errorCode}\nError toggling ghost mode:`, error);
      toast({
        title: "Error",
        description: `Failed to toggle ghost mode. Please try again. (Code: ${errorCode})`,
        variant: "destructive",
      });
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <Ghost className={`w-5 h-5 ${isGhostMode ? 'text-purple-400' : 'text-gray-400'}`} />
      <div className="flex-1">
        <Label htmlFor="ghost-mode" className="text-white font-medium">
          Ghost Mode
        </Label>
        <p className="ft-body text-gray-400 mt-1">
          Appear offline while accessing encrypted ghost sessions
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {isGhostMode ? (
          <EyeOff className="w-4 h-4 text-purple-400" />
        ) : (
          <Eye className="w-4 h-4 text-gray-400" />
        )}
        <Switch
          id="ghost-mode"
          checked={isGhostMode}
          onCheckedChange={toggleGhostMode}
          className="data-[state=checked]:bg-purple-600"
        />
      </div>
    </div>
  );
};
