
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Lock, Users, LogOut, MessageSquare, User as UserIcon, UserPlus, Edit2, AlertTriangle } from 'lucide-react';
import { ContactList } from './ContactList';
import { SecurityPanel } from './SecurityPanel';
import { UserSearchDialog } from './UserSearchDialog';
import { EditCallSignDialog } from './EditCallSignDialog';
import { HoldPanicButton } from './HoldPanicButton';
import { StatusBar } from './StatusBar';
import { auth, db } from '@/integrations/firebase/client';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { TeamList } from './TeamList';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useUserRisk } from '@/contexts/UserRiskContext';
import { Button } from '@/components/ui/button';
import { StatusUser } from '@/services/statusService';
import { AppSettingsMenu } from './AppSettingsMenu';

interface SidebarProps {
  activeChat: string;
  onChatSelect: (chatId: string) => void;
  onViewStatus?: (statusUser: StatusUser) => void;
  onCreateStatus?: () => void;
  statusRefreshKey?: number;
}

export const Sidebar = ({
  activeChat,
  onChatSelect,
  onViewStatus,
  onCreateStatus,
  statusRefreshKey
}: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'teams' | 'security'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showEditCallSign, setShowEditCallSign] = useState(false);
  const [callSign, setCallSign] = useState<string>('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { switchToConversation } = useDirectMessages();
  const { isFeatureVisible } = useUserRisk();

  // Subscribe to user's profile to get call sign
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const profileRef = doc(db, 'profiles', user.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setCallSign(snap.data().callSign || '');
          }
        });
        return () => unsubscribeProfile();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  const handleStartConversation = (conversationId: string) => {
    switchToConversation(conversationId);
    onChatSelect(conversationId);
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header - Cleaner design */}
      <div className="p-4 border-b border-gray-800">
        {/* Brand & Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Shield className="w-6 h-6 text-green-500" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">SecureChat</h1>
              <span className="text-[10px] text-gray-500 font-mono">FORTRESS</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30">
            <Lock className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">SECURE</span>
          </div>
        </div>

        {/* User Profile Card */}
        {callSign && (
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 mb-4">
            <button
              onClick={() => navigate('/profile-settings')}
              className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-black" />
              </div>
              <div className="min-w-0 text-left">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Call Sign</span>
                <span className="text-sm text-white font-semibold truncate block">{callSign}</span>
              </div>
            </button>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowEditCallSign(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Edit call sign"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <AppSettingsMenu
                triggerClassName="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 text-sm transition-all"
            />
          </div>
          <Button
            onClick={() => setShowUserSearch(true)}
            size="sm"
            className="bg-green-600 hover:bg-green-500 text-black px-3 rounded-xl h-[42px]"
            title="Start new conversation"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {onViewStatus && onCreateStatus && (
        <StatusBar
          key={statusRefreshKey}
          variant="sidebar"
          onViewStatus={onViewStatus}
          onCreateStatus={onCreateStatus}
        />
      )}

      {/* Tabs - Pill style */}
      <div className="px-3 py-2 border-b border-gray-800">
        <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'chats'
                ? 'bg-green-600 text-black shadow-lg shadow-green-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'teams'
                ? 'bg-green-600 text-black shadow-lg shadow-green-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-green-600 text-black shadow-lg shadow-green-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
        </div>
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

      {/* Footer - Quick Actions */}
      <div className="p-3 border-t border-gray-800 space-y-2">
        {/* Panic Mode - Only visible for high-risk users */}
        {isFeatureVisible('panic-mode') && (
          <div className="p-3 bg-red-900/10 border border-red-800/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-400 font-medium">Emergency</span>
            </div>
            <HoldPanicButton variant="full" />
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white font-medium transition-all text-sm border border-gray-700"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* User Search Dialog */}
      <UserSearchDialog
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onStartConversation={handleStartConversation}
      />

      {/* Edit Call Sign Dialog */}
      <EditCallSignDialog
        isOpen={showEditCallSign}
        onClose={() => setShowEditCallSign(false)}
        currentCallSign={callSign}
        onCallSignUpdated={(newCallSign) => setCallSign(newCallSign)}
      />
    </div>
  );
};
