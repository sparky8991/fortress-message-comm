
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Ghost, Eye, EyeOff } from 'lucide-react';

export const GhostModeToggle = () => {
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchGhostModeStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('ghost_mode_active')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setIsGhostMode(data?.ghost_mode_active || false);
      } catch (error) {
        console.error('Error fetching ghost mode status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGhostModeStatus();
  }, []);

  const toggleGhostMode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newGhostMode = !isGhostMode;
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ghost_mode_active: newGhostMode,
          last_seen: newGhostMode ? new Date().toISOString() : null
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsGhostMode(newGhostMode);
      toast({
        title: newGhostMode ? "Ghost Mode Activated" : "Ghost Mode Deactivated",
        description: newGhostMode 
          ? "You appear offline to team members. You can still join ghost sessions."
          : "You're now visible to team members.",
      });
    } catch (error) {
      console.error('Error toggling ghost mode:', error);
      toast({
        title: "Error",
        description: "Failed to toggle ghost mode. Please try again.",
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
        <p className="text-sm text-gray-400 mt-1">
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
