import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamMembersList } from './TeamMembersList';
import { GhostModeToggle } from './GhostModeToggle';
import { GhostSessionManager } from './GhostSessionManager';
import { ArrowLeft, Calendar, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
                
                <div className="space-y-4">
                    <div>
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
