
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Copy, Check } from 'lucide-react';

type TeamRole = 'diamond_in_the_rough' | 'team_lead' | 'team_organizer' | 'team_user';

interface InviteMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  teamId: string;
  teamName: string;
}

// Generate a random invitation code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const createInvitation = async (data: {
  teamId: string;
  teamName: string;
  email: string;
  role: TeamRole;
}) => {
  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const invitationsRef = collection(db, 'team_invitations');
  await addDoc(invitationsRef, {
    team_id: data.teamId,
    invitation_code: inviteCode,
    email: data.email,
    role: data.role,
    status: 'pending',
    expires_at: expiresAt,
    created_at: serverTimestamp()
  });

  return { inviteCode, email: data.email };
};

export const InviteMemberDialog = ({ isOpen, onOpenChange, teamId, teamName }: InviteMemberDialogProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('team_user');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', teamId] });

      const link = `${window.location.origin}/invite/${data.inviteCode}`;
      setInviteLink(link);

      toast({
        title: "Invitation Created!",
        description: `Share the link with ${data.email} to invite them.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create invitation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      teamId,
      teamName,
      email: email.trim(),
      role
    });
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard.",
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setEmail('');
    setRole('team_user');
    setInviteLink(null);
    setCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create an invitation link to join "{teamName}".
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-700 rounded-lg">
              <Label className="text-gray-300 mb-2 block">Invitation Link</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="bg-gray-600 border-gray-500 text-white text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyLink}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Share this link with {email}. Expires in 7 days.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" onClick={handleClose} className="bg-green-500 hover:bg-green-600">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: TeamRole) => setRole(value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="team_user">Team User</SelectItem>
                  <SelectItem value="team_organizer">Team Organizer</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-green-500 hover:bg-green-600">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
