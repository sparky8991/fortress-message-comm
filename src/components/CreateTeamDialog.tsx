
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

const createTeam = async (teamName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
        .from('teams')
        .insert([{ name: teamName, created_by: user.id }])
        .select();

    if (error) {
        throw error;
    }
    return data;
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
        onError: (error) => {
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
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle>Create a New Team</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Enter a name for your new team. You can invite members later.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <Input
                            id="name"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Team Name (e.g., Alpha Squad)"
                            className="bg-gray-700 border-gray-600 text-white"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                           <Button type="button" variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={mutation.isPending} className="bg-green-500 hover:bg-green-600">
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Team
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
