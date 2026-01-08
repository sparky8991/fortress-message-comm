import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '@/integrations/firebase/client';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, CheckCircle, XCircle } from 'lucide-react';

interface Invitation {
  id: string;
  team_id: string;
  invitation_code: string;
  status: string;
  expires_at: Date;
  team?: {
    id: string;
    name: string;
  };
}

export const InvitePage = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'accepted' | 'error'>('loading');

  useEffect(() => {
    const checkInvitation = async () => {
      if (!inviteCode) {
        setStatus('invalid');
        setLoading(false);
        return;
      }

      try {
        // Query for the invitation
        const invitationsRef = collection(db, 'team_invitations');
        const q = query(
          invitationsRef,
          where('invitation_code', '==', inviteCode),
          where('status', '==', 'pending')
        );
        const invitationSnap = await getDocs(q);

        if (invitationSnap.empty) {
          setStatus('invalid');
          setLoading(false);
          return;
        }

        const invDoc = invitationSnap.docs[0];
        const invData = invDoc.data();

        // Check expiration
        const expiresAt = invData.expires_at?.toDate?.() || new Date(invData.expires_at);
        if (expiresAt < new Date()) {
          setStatus('invalid');
          setLoading(false);
          return;
        }

        // Get team info
        const teamRef = doc(db, 'teams', invData.team_id);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          setStatus('invalid');
          setLoading(false);
          return;
        }

        setInvitation({
          id: invDoc.id,
          team_id: invData.team_id,
          invitation_code: invData.invitation_code,
          status: invData.status,
          expires_at: expiresAt,
          team: {
            id: teamSnap.id,
            name: teamSnap.data().name
          }
        });
        setStatus('valid');
      } catch (error: any) {
        const errorCode = "INVITE_CHECK_FAILED";
        console.error(`// ERROR_CODE: ${errorCode}\nError checking invitation:`, error);
        setStatus('error');
        toast({
          title: "Error",
          description: `Failed to verify invitation. Please try again. (Code: ${errorCode})`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkInvitation();
  }, [inviteCode, toast]);

  const handleAcceptInvitation = async () => {
    const user = auth.currentUser;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to accept the invitation.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!invitation) {
      toast({
        title: "Error",
        description: "Invalid invitation.",
        variant: "destructive",
      });
      return;
    }

    setAccepting(true);

    try {
      // Check if user is already a member
      const membersRef = collection(db, 'team_members');
      const memberQuery = query(
        membersRef,
        where('team_id', '==', invitation.team_id),
        where('user_id', '==', user.uid)
      );
      const memberSnap = await getDocs(memberQuery);

      if (!memberSnap.empty) {
        toast({
          title: "Already a Member",
          description: "You are already a member of this team.",
          variant: "destructive",
        });
        setAccepting(false);
        return;
      }

      // Add user to team
      await addDoc(membersRef, {
        team_id: invitation.team_id,
        user_id: user.uid,
        role: 'team_user',
        joined_at: serverTimestamp()
      });

      // Update invitation status
      const invitationRef = doc(db, 'team_invitations', invitation.id);
      await updateDoc(invitationRef, {
        status: 'accepted',
        accepted_by: user.uid,
        accepted_at: serverTimestamp()
      });

      setStatus('accepted');
      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined ${invitation.team?.name}!`,
      });
      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      const errorCode = "INVITE_ACCEPT_FAILED";
      console.error(`// ERROR_CODE: ${errorCode}\nError accepting invitation:`, error);
      toast({
        title: "Error",
        description: `Failed to accept invitation. Please try again. (Code: ${errorCode})`,
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md w-full text-center">
        {status === 'valid' && (
          <>
            <Users className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Team Invitation</h1>
            <p className="text-gray-400 mb-6">
              You've been invited to join <span className="text-white font-semibold">{invitation?.team?.name}</span>
            </p>
            <Button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept Invitation
            </Button>
          </>
        )}

        {status === 'accepted' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Welcome!</h1>
            <p className="text-gray-400 mb-6">
              You've successfully joined the team. Redirecting to the app...
            </p>
          </>
        )}

        {(status === 'invalid' || status === 'error') && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
            <p className="text-gray-400 mb-6">
              This invitation link is invalid or has expired.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go to App
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
