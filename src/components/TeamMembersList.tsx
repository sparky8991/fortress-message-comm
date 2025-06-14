
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Crown, Shield, Users, Star, UserPlus } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type TeamRole = Database['public']['Enums']['team_role'];

interface TeamMemberWithProfile {
    user_id: string;
    team_id: string;
    joined_at: string;
    role: TeamRole;
    profiles: {
        id: string;
        username: string | null;
        full_name: string | null;
    } | null;
}

const fetchTeamMembers = async (teamId: string): Promise<TeamMemberWithProfile[]> => {
    const { data, error } = await supabase
        .from('team_members')
        .select(`
            *,
            profiles (
                id,
                username,
                full_name
            )
        `)
        .eq('team_id', teamId);
    
    if (error) throw error;
    return data as TeamMemberWithProfile[];
};

const updateMemberRole = async ({ teamId, userId, role }: { teamId: string; userId: string; role: TeamRole }) => {
    const { error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userId);
    
    if (error) throw error;
};

interface TeamMembersListProps {
    teamId: string;
    currentUserRole?: TeamRole;
}

const getRoleIcon = (role: TeamRole) => {
    switch (role) {
        case 'diamond_in_the_rough':
            return <Crown className="w-4 h-4 text-yellow-500" />;
        case 'team_lead':
            return <Shield className="w-4 h-4 text-blue-500" />;
        case 'team_organizer':
            return <Star className="w-4 h-4 text-purple-500" />;
        case 'team_user':
            return <Users className="w-4 h-4 text-gray-500" />;
        default:
            return <Users className="w-4 h-4 text-gray-500" />;
    }
};

const getRoleBadgeColor = (role: TeamRole) => {
    switch (role) {
        case 'diamond_in_the_rough':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        case 'team_lead':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        case 'team_organizer':
            return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
        case 'team_user':
            return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
};

const formatRoleName = (role: TeamRole) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const TeamMembersList = ({ teamId, currentUserRole }: TeamMembersListProps) => {
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [newRole, setNewRole] = useState<TeamRole | null>(null);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: members, isLoading } = useQuery({
        queryKey: ['team-members', teamId],
        queryFn: () => fetchTeamMembers(teamId)
    });

    const updateRoleMutation = useMutation({
        mutationFn: updateMemberRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
            toast({
                title: "Role Updated",
                description: "Team member role has been updated successfully.",
            });
            setSelectedMember(null);
            setNewRole(null);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to update role: ${error.message}`,
                variant: "destructive",
            });
        },
    });

    const canManageRoles = currentUserRole === 'diamond_in_the_rough' || currentUserRole === 'team_lead';

    const handleRoleUpdate = () => {
        if (selectedMember && newRole) {
            updateRoleMutation.mutate({
                teamId,
                userId: selectedMember,
                role: newRole
            });
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center text-gray-400">Loading team members...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Team Members</h3>
                {canManageRoles && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Member
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                {members?.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                            {getRoleIcon(member.role)}
                            <div>
                                <p className="text-white font-medium">
                                    {member.profiles?.full_name || member.profiles?.username || 'Unknown User'}
                                </p>
                                <Badge className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                                    {formatRoleName(member.role)}
                                </Badge>
                            </div>
                        </div>

                        {canManageRoles && member.role !== 'diamond_in_the_rough' && (
                            <div className="flex items-center space-x-2">
                                {selectedMember === member.user_id ? (
                                    <>
                                        <Select value={newRole || ''} onValueChange={(value: TeamRole) => setNewRole(value)}>
                                            <SelectTrigger className="w-40 bg-gray-600 border-gray-500">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-700 border-gray-600">
                                                <SelectItem value="team_lead">Team Lead</SelectItem>
                                                <SelectItem value="team_organizer">Team Organizer</SelectItem>
                                                <SelectItem value="team_user">Team User</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button size="sm" onClick={handleRoleUpdate} disabled={!newRole}>
                                            Save
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => {
                                            setSelectedMember(null);
                                            setNewRole(null);
                                        }}>
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={() => {
                                        setSelectedMember(member.user_id);
                                        setNewRole(member.role);
                                    }}>
                                        Change Role
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
