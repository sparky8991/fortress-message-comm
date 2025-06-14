
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type TeamRole = Database['public']['Enums']['team_role'];

interface InviteMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  teamId: string;
  teamName: string;
}

const sendInvitation = async (data: {
  teamId: string;
  teamName: string;
  contact: string;
  contactType: 'email' | 'phone';
  role: TeamRole;
}) => {
  const { data: response, error } = await supabase.functions.invoke('send-invitation', {
    body: data
  });
  
  if (error) throw error;
  return response;
};

export const InviteMemberDialog = ({ isOpen, onOpenChange, teamId, teamName }: InviteMemberDialogProps) => {
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState<TeamRole>('team_user');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: sendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', teamId] });
      toast({
        title: "Invitation Sent!",
        description: `Team invitation has been sent successfully.`,
      });
      onOpenChange(false);
      setContact('');
      setRole('team_user');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send invitation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contact.trim()) {
      toast({
        title: "Invalid Contact",
        description: "Please enter a valid email or phone number.",
        variant: "destructive",
      });
      return;
    }

    // Basic validation
    if (contactType === 'email' && !contact.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (contactType === 'phone' && !/^\+?[\d\s\-\(\)]+$/.test(contact)) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      teamId,
      teamName,
      contact: contact.trim(),
      contactType,
      role
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription className="text-gray-400">
            Send an invitation to join "{teamName}" via email or SMS.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactType">Contact Method</Label>
            <Select value={contactType} onValueChange={(value: 'email' | 'phone') => setContactType(value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="email">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="phone">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    Phone Number
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">
              {contactType === 'email' ? 'Email Address' : 'Phone Number'}
            </Label>
            <Input
              id="contact"
              type={contactType === 'email' ? 'email' : 'tel'}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={contactType === 'email' ? 'user@example.com' : '+1234567890'}
              className="bg-gray-700 border-gray-600 text-white"
            />
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-green-500 hover:bg-green-600">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
