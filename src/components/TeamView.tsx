
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamMembersList } from './TeamMembersList';
import { ArrowLeft, Calendar, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fetchTeamDetails = async (teamId: string) => {
    const { data, error } = await supabase
        .from('teams')
        .select(`
            *,
            profiles!teams_created_by_fkey (
                username,
                full_name
            )
        `)
        .eq('id', teamId)
        .single();
    
    if (error) throw error;
    return data;
};

const fetchCurrentUserRole = async (teamId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();
    
    if (error) return null;
    return data.role;
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
                
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                            <Crown className="w-4 h-4 text-yellow-500" />
                            <span>Created by {team.profiles?.full_name || team.profiles?.username || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(team.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <TeamMembersList 
                    teamId={teamId} 
                    teamName={team.name}
                    currentUserRole={currentUserRole} 
                />
            </div>
        </div>
    );
};
