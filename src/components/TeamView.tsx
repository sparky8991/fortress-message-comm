import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth, db } from '@/integrations/firebase/client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { TeamMembersList } from './TeamMembersList';
import { GhostModeToggle } from './GhostModeToggle';
import { GhostSessionManager } from './GhostSessionManager';
import { ArrowLeft, Calendar, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TeamDetails {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  creator?: {
    callSign: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

const fetchTeamDetails = async (teamId: string): Promise<TeamDetails | null> => {
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) return null;

  const teamData = teamSnap.data();

  // Get creator profile
  let creator = null;
  if (teamData.created_by) {
    const profileRef = doc(db, 'profiles', teamData.created_by);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      creator = {
        callSign: profileData.callSign || null,
        firstName: profileData.firstName || null,
        lastName: profileData.lastName || null
      };
    }
  }

  return {
    id: teamSnap.id,
    name: teamData.name,
    created_by: teamData.created_by,
    created_at: teamData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    creator
  };
};

const fetchCurrentUserRole = async (teamId: string): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const membersRef = collection(db, 'team_members');
  const q = query(
    membersRef,
    where('team_id', '==', teamId),
    where('user_id', '==', user.uid)
  );
  const memberSnap = await getDocs(q);

  if (memberSnap.empty) return null;
  return memberSnap.docs[0].data().role;
};

interface TeamViewProps {
  teamId: string;
  onBack: () => void;
}

export const TeamView = ({ teamId, onBack }: TeamViewProps) => {
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team-details', teamId],
    queryFn: () => fetchTeamDetails(teamId)
  });

  const { data: currentUserRole } = useQuery({
    queryKey: ['user-role', teamId],
    queryFn: () => fetchCurrentUserRole(teamId)
  });

  if (teamLoading) {
    return <div className="p-4 text-center text-gray-400">Loading team details...</div>;
  }

  if (!team) {
    return <div className="p-4 text-center text-red-400">Team not found</div>;
  }

  const getCreatorName = () => {
    if (!team.creator) return 'Unknown';
    if (team.creator.firstName && team.creator.lastName) {
      return `${team.creator.firstName} ${team.creator.lastName}`;
    }
    return team.creator.callSign || 'Unknown';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>

        <div className="space-y-4">
          <div>
            <h2 className="ft-head font-bold text-white">{team.name}</h2>
            <div className="flex items-center space-x-4 ft-body text-gray-400">
              <div className="flex items-center space-x-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span>Created by {getCreatorName()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(team.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <GhostModeToggle />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="members" className="h-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-b border-gray-700 rounded-none">
            <TabsTrigger value="members" className="data-[state=active]:bg-gray-700">
              Team Members
            </TabsTrigger>
            <TabsTrigger value="ghost" className="data-[state=active]:bg-gray-700">
              Ghost Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="p-4 h-full">
            <TeamMembersList
              teamId={teamId}
              teamName={team.name}
              currentUserRole={currentUserRole}
            />
          </TabsContent>

          <TabsContent value="ghost" className="p-4 h-full">
            <GhostSessionManager teamId={teamId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
