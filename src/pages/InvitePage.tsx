import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, CheckCircle, XCircle } from 'lucide-react';

interface InvitationResponse {
  success: boolean;
  message: string;
}

export const InvitePage = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'accepted' | 'error'>('loading');

  useEffect(() => {
    const checkInvitation = async () => {
      if (!inviteCode) {
        setStatus('invalid');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('team_invitations')
          .select(`
            *,
            teams (
              id,
              name
            )
          `)
          .eq('invitation_code', inviteCode)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .single();

        if (error || !data) {
          setStatus('invalid');
        } else {
          setInvitation(data);
          setStatus('valid');
        }
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to accept the invitation.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setAccepting(true);
    
    try {
      const { data, error } = await supabase.rpc('accept_team_invitation', {
        invitation_code: inviteCode
      });

      if (error) {
        const rpcError = new Error(error.message);
        rpcError.name = "SupabaseRPCError";
        throw rpcError;
      };

      // Safely cast the response with proper type checking
      const response = data as unknown as InvitationResponse;

      if (response.success) {
        setStatus('accepted');
        toast({
          title: "Welcome to the team!",
          description: response.message,
        });
        setTimeout(() => navigate('/'), 2000);
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
      }
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
              You've been invited to join <span className="text-white font-semibold">{invitation?.teams?.name}</span>
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
