
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth, db } from '@/integrations/firebase/client';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Ghost, Plus, Users, Lock, MessageSquare } from 'lucide-react';

interface GhostSession {
  id: string;
  session_name: string;
  created_by: string;
  team_id: string;
  max_members: number;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  members?: { user_id: string; is_active: boolean }[];
}

interface GhostSessionManagerProps {
  teamId: string;
}

const fetchGhostSessions = async (teamId: string): Promise<GhostSession[]> => {
  const sessionsRef = collection(db, 'ghost_sessions');
  const q = query(
    sessionsRef,
    where('team_id', '==', teamId),
    where('is_active', '==', true)
  );
  const sessionsSnap = await getDocs(q);

  const sessions: GhostSession[] = [];

  for (const sessionDoc of sessionsSnap.docs) {
    const sessionData = sessionDoc.data();

    // Get members for this session
    const membersRef = collection(db, 'ghost_session_members');
    const membersQuery = query(membersRef, where('session_id', '==', sessionDoc.id));
    const membersSnap = await getDocs(membersQuery);

    const members = membersSnap.docs.map(mDoc => ({
      user_id: mDoc.data().user_id,
      is_active: mDoc.data().is_active || false
    }));

    sessions.push({
      id: sessionDoc.id,
      session_name: sessionData.session_name,
      created_by: sessionData.created_by,
      team_id: sessionData.team_id,
      max_members: sessionData.max_members || 5,
      is_active: sessionData.is_active,
      created_at: sessionData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      expires_at: sessionData.expires_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      members
    });
  }

  return sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const createGhostSession = async (data: {
  teamId: string;
  sessionName: string;
  encryptionKey: string;
}): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  const sessionsRef = collection(db, 'ghost_sessions');
  const sessionDoc = await addDoc(sessionsRef, {
    session_name: data.sessionName,
    team_id: data.teamId,
    created_by: user.uid,
    encryption_key_hash: data.encryptionKey,
    max_members: 5,
    is_active: true,
    created_at: serverTimestamp(),
    expires_at: expiresAt
  });

  // Add creator as first member
  const membersRef = collection(db, 'ghost_session_members');
  await addDoc(membersRef, {
    session_id: sessionDoc.id,
    user_id: user.uid,
    is_active: true,
    joined_at: serverTimestamp()
  });

  return sessionDoc.id;
};

const joinGhostSession = async (sessionId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Check if already a member
  const membersRef = collection(db, 'ghost_session_members');
  const existingQuery = query(
    membersRef,
    where('session_id', '==', sessionId),
    where('user_id', '==', user.uid)
  );
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    // Update existing membership
    const memberDoc = existingSnap.docs[0];
    await updateDoc(doc(db, 'ghost_session_members', memberDoc.id), {
      is_active: true
    });
  } else {
    // Add new member
    await addDoc(membersRef, {
      session_id: sessionId,
      user_id: user.uid,
      is_active: true,
      joined_at: serverTimestamp()
    });
  }
};

export const GhostSessionManager = ({ teamId }: GhostSessionManagerProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['ghost-sessions', teamId],
    queryFn: () => fetchGhostSessions(teamId)
  });

  const createMutation = useMutation({
    mutationFn: createGhostSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghost-sessions', teamId] });
      toast({
        title: "Ghost Session Created",
        description: "Your encrypted ghost session is ready.",
      });
      setIsCreateDialogOpen(false);
      setSessionName('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create ghost session: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const joinMutation = useMutation({
    mutationFn: joinGhostSession,
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['ghost-sessions', teamId] });
      setSelectedSession(sessionId);
      toast({
        title: "Joined Ghost Session",
        description: "You've joined the encrypted session.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to join session: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      toast({
        title: "Session Name Required",
        description: "Please enter a name for the ghost session.",
        variant: "destructive",
      });
      return;
    }

    // Generate a random encryption key
    const encryptionKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    createMutation.mutate({
      teamId,
      sessionName: sessionName.trim(),
      encryptionKey
    });
  };

  const getActiveMemberCount = (session: GhostSession) => {
    return session.members?.filter(member => member.is_active).length || 0;
  };

  if (isLoading) {
    return <div className="p-4 text-center text-gray-400">Loading ghost sessions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Ghost className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Ghost Sessions</h3>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>

      <div className="space-y-2">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => (
            <div
              key={session.id}
              className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-purple-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-white">{session.session_name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{getActiveMemberCount(session)}/{session.max_members}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Encrypted</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => joinMutation.mutate(session.id)}
                    disabled={joinMutation.isPending || getActiveMemberCount(session) >= session.max_members}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Join
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Ghost className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p>No ghost sessions available.</p>
            <p className="text-sm mt-1">Create one to start encrypted communication.</p>
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Ghost className="w-5 h-5 text-purple-400" />
              <span>Create Ghost Session</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="session-name">Session Name</Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter session name..."
                className="bg-gray-700 border-gray-600 text-white mt-2"
              />
            </div>
            <div className="text-sm text-gray-400 bg-gray-900 p-3 rounded border border-gray-700">
              <Lock className="w-4 h-4 inline mr-2" />
              This session will use enhanced encryption and be limited to 5 members maximum.
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={createMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
