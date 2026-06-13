
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth, db } from '@/integrations/firebase/client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Loader2, Plus, Users } from 'lucide-react';
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
    return (
      <div className="flex h-28 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#36E27B]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-3 mt-3 rounded-sm border border-[#5C2420] bg-red-950/15 p-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#FF6B61]">
        Team directory failed: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col font-mono text-[#DCEAE1]">
      <div className="border-b border-[#141E18] px-3 py-2.5">
        <button
          onClick={() => setCreateTeamDialogOpen(true)}
          className="fortress-focus flex h-8 w-full items-center justify-center gap-2 rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 px-3 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#36E27B] transition-colors hover:bg-[#36E27B]/15 hover:text-[#ECF7F0]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create Team</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {teams && teams.length > 0 ? (
          teams.map(team => (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className="group mx-2 flex cursor-pointer items-center gap-2.5 rounded-sm border border-transparent px-2.5 py-2.5 transition-colors hover:border-[#1C2B22] hover:bg-[#101814]"
            >
              <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-sm border border-[#1E5C3C] bg-[#12301F] text-[#7BEFA9]">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[12px] font-black leading-tight tracking-[0.04em] text-[#ECF7F0]">
                  {team.name}
                </div>
                <div className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[#76897D]">
                  Team channel ready
                </div>
              </div>
              <div className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#36E27B] opacity-70 group-hover:opacity-100">
                OPEN
              </div>
            </div>
          ))
        ) : (
          <div className="mx-3 mt-6 border border-[#1C2B22] bg-[#0F1612] px-3 py-5 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-[#36513F]" strokeWidth={1.5} />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#DCEAE1]">
              No team channels
            </p>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#76897D]">
              Create a team to start grouped traffic.
            </p>
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
