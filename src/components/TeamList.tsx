
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth, db } from '@/integrations/firebase/client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Loader2, PlusCircle, Users } from 'lucide-react';
import { CreateTeamDialog } from './CreateTeamDialog';
import { TeamView } from './TeamView';

interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

const fetchTeams = async (): Promise<Team[]> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Get all teams where user is a member
  const membersRef = collection(db, 'team_members');
  const membersQuery = query(membersRef, where('user_id', '==', user.uid));
  const membersSnap = await getDocs(membersQuery);

  const teamIds = membersSnap.docs.map(doc => doc.data().team_id);

  if (teamIds.length === 0) {
    // Also check teams created by user
    const teamsRef = collection(db, 'teams');
    const createdTeamsQuery = query(teamsRef, where('created_by', '==', user.uid));
    const createdTeamsSnap = await getDocs(createdTeamsQuery);

    return createdTeamsSnap.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      created_by: doc.data().created_by,
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
    }));
  }

  // Get team details
  const teams: Team[] = [];
  const teamsRef = collection(db, 'teams');
  const teamsSnap = await getDocs(teamsRef);

  teamsSnap.forEach(doc => {
    if (teamIds.includes(doc.id) || doc.data().created_by === user.uid) {
      teams.push({
        id: doc.id,
        name: doc.data().name,
        created_by: doc.data().created_by,
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    }
  });

  return teams;
};

interface TeamListProps {
  onTeamSelect: (teamId: string) => void;
}

export const TeamList = ({ onTeamSelect }: TeamListProps) => {
  const [isCreateTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams
  });

  if (selectedTeam) {
    return (
      <TeamView
        teamId={selectedTeam}
        onBack={() => setSelectedTeam(null)}
      />
    );
  }

  if (isLoading) {
    return <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>;
  }

  if (error) {
    return <div className="p-4 text-red-400">Error loading teams: {(error as Error).message}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => setCreateTeamDialogOpen(true)}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-green-600/20 hover:bg-green-600/40 rounded-lg text-green-400 hover:text-green-300 font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Team</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {teams && teams.length > 0 ? (
          teams.map(team => (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className="p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-750"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{team.name}</h3>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p>You are not part of any teams yet.</p>
            <p className="text-sm mt-2">Create a team to start collaborating.</p>
          </div>
        )}
      </div>
      <CreateTeamDialog
        isOpen={isCreateTeamDialogOpen}
        onOpenChange={setCreateTeamDialogOpen}
      />
    </div>
  );
};
