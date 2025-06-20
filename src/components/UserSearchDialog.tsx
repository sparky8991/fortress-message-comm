
import React, { useState } from 'react';
import { Search, User, MessageSquare, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UserSearchResult {
  id: string;
  username: string;
  full_name: string;
  user_number: number;
  avatar_url: string;
}

interface UserSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (conversationId: string) => void;
}

export const UserSearchDialog = ({ isOpen, onClose, onStartConversation }: UserSearchDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_term: searchTerm.trim()
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to search for users. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = async (userId: string) => {
    setIsCreatingConversation(true);
    try {
      const { data: conversationId, error } = await supabase.rpc('find_or_create_direct_conversation', {
        other_user_id: userId
      });

      if (error) throw error;

      toast({
        title: '🔒 SECURE CHANNEL ESTABLISHED',
        description: 'Direct conversation initiated successfully.',
      });

      onStartConversation(conversationId);
      onClose();
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to establish secure channel. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const getUserDisplayName = (user: UserSearchResult) => {
    if (user.username) return user.username;
    if (user.full_name) return user.full_name;
    return `User #${user.user_number}`;
  };

  const getUserInitials = (user: UserSearchResult) => {
    if (user.username) return user.username.substring(0, 2).toUpperCase();
    if (user.full_name) return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `#${user.user_number}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-400 font-mono flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>USER SEARCH</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by username, name, or user number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-gray-900 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="bg-green-600 hover:bg-green-700 text-black"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-gray-600 text-white text-sm">
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">{getUserDisplayName(user)}</p>
                      <p className="text-sm text-gray-400">User #{user.user_number}</p>
                      {user.full_name && user.username && (
                        <p className="text-xs text-gray-500">{user.full_name}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartConversation(user.id)}
                    disabled={isCreatingConversation}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-black"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Chat
                  </Button>
                </div>
              ))
            ) : searchTerm.trim() && !isSearching ? (
              <div className="text-center py-8 text-gray-400">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No users found matching your search</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Enter a search term to find users</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
