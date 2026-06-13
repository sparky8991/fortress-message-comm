import React, { useState } from 'react';
import { Loader2, MessageSquare, Search, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { conversationService } from '@/services/conversationService';
import { toast } from '@/hooks/use-toast';

interface UserSearchResult {
  id: string;
  username: string;
  full_name: string;
  email: string;
  verified: boolean;
  avatar_url: string;
}

interface UserSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (conversationId: string) => void;
}

type SearchStage = 'idle' | 'searching' | 'empty' | 'results';

export const UserSearchDialog = ({ isOpen, onClose, onStartConversation }: UserSearchDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchStage, setSearchStage] = useState<SearchStage>('idle');
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const resetSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchStage('idle');
  };

  const handleSearch = async () => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) {
      setSearchResults([]);
      setSearchStage('idle');
      return;
    }

    setSearchStage('searching');
    try {
      const profilesRef = collection(db, 'profiles');
      const allProfilesQuery = query(profilesRef, limit(100));
      const snapshot = await getDocs(allProfilesQuery);
      const results: UserSearchResult[] = [];

      snapshot.forEach((profileDoc) => {
        const data = profileDoc.data();
        const searchableText = [
          data.callSign,
          data.callSignLower,
          data.email,
          data.emailLower,
          data.displayName,
          data.displayNameLower,
          data.firstName,
          data.lastName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (searchableText.includes(searchLower)) {
          results.push({
            id: profileDoc.id,
            username: data.callSign || data.displayName || data.email?.split('@')[0] || 'Unknown',
            full_name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || '',
            email: data.email || '',
            verified: !!data.verified,
            avatar_url: data.avatarUrl || data.photoURL || '',
          });
        }
      });

      setSearchResults(results);
      setSearchStage(results.length ? 'results' : 'empty');
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to search for users. Please try again.',
        variant: 'destructive',
      });
      setSearchStage('idle');
    }
  };

  const handleStartConversation = async (userId: string) => {
    setCreatingId(userId);
    try {
      const conversationId = await conversationService.findOrCreateDirectConversation(userId);

      toast({
        title: 'SECURE CHANNEL ESTABLISHED',
        description: 'Direct conversation initiated successfully.',
      });

      onStartConversation(conversationId);
      onClose();
      resetSearch();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to establish secure channel. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingId(null);
    }
  };

  const getUserInitials = (user: UserSearchResult) =>
    (user.username || user.full_name || '?').slice(0, 2).toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-[#1E5C3C] bg-[#0C120F] text-[#DCEAE1]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-green-400">
            <Search className="h-4 w-4" />
            User Search
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-sm border border-[#1C2B22] bg-[#0F1612] px-2.5">
            <Search className="h-3.5 w-3.5 text-[#5C6E63]" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              placeholder="Search call sign or email..."
              className="border-0 bg-transparent px-0 font-mono text-[11px] text-[#DCEAE1] placeholder-[#5C6E63] focus-visible:ring-0"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searchStage === 'searching' || !searchTerm.trim()}
            className="rounded-sm bg-green-500 px-4 font-mono text-[9px] font-extrabold uppercase tracking-[0.2em] text-black hover:bg-green-400"
          >
            Search
          </Button>
        </div>

        <div className="mt-1 min-h-[230px]">
          {searchStage === 'idle' && (
            <div className="flex h-[230px] flex-col items-center justify-center gap-3.5">
              <Search className="h-10 w-10 text-[#243B30]" strokeWidth={1.4} />
              <div className="font-mono text-[10px] tracking-wide text-[#5C6E63]">
                Enter a search term to find operators
              </div>
            </div>
          )}

          {searchStage === 'searching' && (
            <div className="flex h-[230px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-green-400" />
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#5C6E63]">
                Querying directory...
              </div>
            </div>
          )}

          {searchStage === 'empty' && (
            <div className="flex h-[230px] flex-col items-center justify-center gap-3">
              <UserX className="h-9 w-9 text-[#5C2420]" strokeWidth={1.4} />
              <div className="font-mono text-[10px] tracking-wide text-[#76897D]">
                No users found matching your search
              </div>
            </div>
          )}

          {searchStage === 'results' && (
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#4A5A50]">
                {searchResults.length} result(s)
              </div>
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center gap-3 rounded-sm border border-[#1C2B22] bg-[#101814] p-3">
                  <div className="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-sm border border-[#1E5C3C] bg-[#12301F] font-mono ft-body font-extrabold text-[#7BEFA9]">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getUserInitials(user)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-mono ft-meta font-bold tracking-wide text-[#ECF7F0]">
                        {user.username}
                      </span>
                      <span
                        className="flex-none font-mono text-[7px] font-extrabold uppercase tracking-wide"
                        style={{ color: user.verified ? '#36E27B' : '#F2B43C' }}
                      >
                        {user.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                    <div className="truncate font-mono text-[9px] tracking-wide text-[#76897D]">
                      {user.email || user.full_name}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartConversation(user.id)}
                    disabled={creatingId === user.id}
                    size="sm"
                    className="flex-none gap-1 rounded-sm bg-transparent font-mono text-[8px] font-extrabold uppercase tracking-wide text-green-400 hover:bg-green-500/10"
                    style={{ border: '1px solid #1E5C3C' }}
                  >
                    {creatingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    Chat
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#141E18] pt-2.5 text-center font-mono text-[7px] uppercase tracking-[0.15em] text-[#4A5A50]">
          Directory search uses your signed-in account and returns matching operators
        </div>
      </DialogContent>
    </Dialog>
  );
};
