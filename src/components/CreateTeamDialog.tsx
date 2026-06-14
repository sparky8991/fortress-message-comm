
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auth, db } from '@/integrations/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users } from 'lucide-react';

const createTeam = async (teamName: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const teamsRef = collection(db, 'teams');
  const teamDoc = await addDoc(teamsRef, {
    name: teamName,
    created_by: user.uid,
    created_at: serverTimestamp()
  });

  // Add creator as team member with highest role
  const membersRef = collection(db, 'team_members');
  await addDoc(membersRef, {
    team_id: teamDoc.id,
    user_id: user.uid,
    role: 'diamond_in_the_rough',
    joined_at: serverTimestamp()
  });

  return { id: teamDoc.id, name: teamName };
};

interface CreateTeamDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const CreateTeamDialog = ({ isOpen, onOpenChange }: CreateTeamDialogProps) => {
  const [teamName, setTeamName] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({
        title: "Team Created!",
        description: `Team "${teamName}" has been created successfully.`,
      });
      onOpenChange(false);
      setTeamName('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create team: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length < 3) {
      toast({
        title: "Invalid Name",
        description: "Team name must be at least 3 characters long.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(teamName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen max-w-[100vw] rounded-none border-[#1E5C3C] bg-[#0C120F] p-0 font-mono text-[#DCEAE1] shadow-[0_0_50px_rgba(0,0,0,0.55)] md:w-auto md:max-w-[440px] md:rounded-sm">
        <DialogHeader>
          <div className="border-b border-[#1C2B22] px-4 py-3">
            <DialogTitle className="flex items-center gap-2 font-mono text-[12px] font-black uppercase tracking-[0.18em] text-[#36E27B]">
              <Users className="h-4 w-4" />
              Create Team Channel
            </DialogTitle>
          </div>
          <DialogDescription className="px-4 pt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[#76897D]">
            Enter a team name. You can invite operators after the channel is created.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-3">
          <div className="grid gap-2">
            <label htmlFor="name" className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#76897D]">
              Team name
            </label>
            <Input
              id="name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="ALPHA SQUAD"
              className="h-10 rounded-sm border-[#1C2B22] bg-[#070B09] font-mono text-[13px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]"
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#76897D]">
              Minimum 3 characters. Team creator receives owner role.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-[#1C2B22] pt-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-sm border-[#1C2B22] bg-transparent px-4 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#76897D] hover:border-[#1E5C3C] hover:bg-[#36E27B]/10 hover:text-[#DCEAE1]"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-9 rounded-sm bg-[#36E27B] px-4 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#06130B] hover:bg-[#7BEFA9]"
            >
              {mutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
