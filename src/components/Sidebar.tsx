
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, Shield, Lock, Users, LogOut, MessageSquare, MoreVertical, User as UserIcon, UserPlus } from 'lucide-react';
import { ContactList } from './ContactList';
import { SecurityPanel } from './SecurityPanel';
import { UserSearchDialog } from './UserSearchDialog';
import { auth } from '@/integrations/firebase/client';
import { signOut } from 'firebase/auth';
import { TeamList } from './TeamList';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeChat: string;
  onChatSelect: (chatId: string) => void;
}

export const Sidebar = ({ activeChat, onChatSelect }: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'teams' | 'security'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { switchToConversation } = useDirectMessages();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  const handleStartConversation = (conversationId: string) => {
    switchToConversation(conversationId);
    onChatSelect(conversationId);
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-green-500" />
            <h1 className="text-base font-bold text-white">SecureChat</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500 font-medium">ENCRYPTED</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[32px] min-w-[32px] flex items-center justify-center">
                  <MoreVertical className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white w-48">
                <DropdownMenuItem
                  onSelect={() => navigate('/profile-settings')}
                  className="cursor-pointer focus:bg-gray-700 focus:text-white"
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="cursor-pointer text-red-400 focus:bg-red-600/30 focus:text-red-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search with new user button */}
        <div className="pt-5 pb-1">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>
            <Button
              onClick={() => setShowUserSearch(true)}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-black px-2"
              title="Start new conversation"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-2.5 px-2 text-xs font-medium transition-colors min-h-[40px] flex items-center justify-center ${
            activeTab === 'chats'
              ? 'text-green-500 border-b-2 border-green-500 bg-gray-750'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3 h-3 mr-1.5" />
          <span>Chats</span>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-2.5 px-2 text-xs font-medium transition-colors min-h-[40px] flex items-center justify-center ${
            activeTab === 'teams'
              ? 'text-green-500 border-b-2 border-green-500 bg-gray-750'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <Users className="w-3 h-3 mr-1.5" />
          <span>Teams</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-2.5 px-2 text-xs font-medium transition-colors min-h-[40px] flex items-center justify-center ${
            activeTab === 'security'
              ? 'text-green-500 border-b-2 border-green-500 bg-gray-750'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <Settings className="w-3 h-3 mr-1.5" />
          <span>Security</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <ContactList 
            activeChat={activeChat}
            onChatSelect={onChatSelect}
            searchQuery={searchQuery}
            includeDirectMessages={true}
          />
        ) : activeTab === 'teams' ? (
          <TeamList onTeamSelect={(teamId) => {
            console.log('Team selected:', teamId);
          }} />
        ) : (
          <SecurityPanel />
        )}
      </div>

      {/* Footer with Logout */}
      <div className="p-3 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-red-600/20 hover:bg-red-600/40 rounded-lg text-red-400 hover:text-red-300 font-medium transition-colors min-h-[40px] text-sm"
        >
          <LogOut className="w-3 h-3" />
          <span>Logout</span>
        </button>
      </div>

      {/* User Search Dialog */}
      <UserSearchDialog
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onStartConversation={handleStartConversation}
      />
    </div>
  );
};
