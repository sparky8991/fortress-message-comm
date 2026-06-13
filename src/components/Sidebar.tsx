
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Lock, Users, LogOut, MessageSquare, UserPlus, Edit2, AlertTriangle } from 'lucide-react';
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
  const initials = callSign ? callSign.slice(0, 2).toUpperCase() : 'SC';

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
    <div className="w-80 bg-[#06100b]/98 border-r border-green-500/15 flex flex-col h-full text-gray-100">
      {/* Header */}
      <div className="p-3 border-b border-green-500/15">
        {/* Brand & Status */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 fortress-panel-muted rounded flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight font-mono tracking-[0.14em]">SECURECHAT</h1>
              <span className="fortress-command">Fortress Terminal</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-green-500/30 bg-green-500/10">
            <Lock className="w-3 h-3 text-green-400" />
            <span className="fortress-command-strong">Secure</span>
          </div>
        </div>

        {/* User Profile Card */}
        {callSign && (
          <div className="flex items-center justify-between p-3 fortress-panel rounded mb-3">
            <button
              onClick={() => navigate('/profile-settings')}
              className="flex items-center gap-3 min-w-0 hover:opacity-85 transition-opacity fortress-focus rounded"
            >
              <div className="w-10 h-10 rounded border border-green-400/40 bg-green-500/15 flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-sm font-black text-green-300">{initials}</span>
              </div>
              <div className="min-w-0 text-left">
                <span className="fortress-command block">Call Sign</span>
                <span className="text-sm text-white font-bold truncate block font-mono">
                  {callSign}
                  <span className="ml-1 text-green-400">✓</span>
                </span>
              </div>
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden min-[370px]:flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="fortress-command">Online</span>
              </div>
              <button
                onClick={() => setShowEditCallSign(true)}
                className="p-2 rounded text-gray-400 hover:text-green-300 hover:bg-green-500/10 transition-colors fortress-focus"
                title="Edit call sign"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <AppSettingsMenu
                triggerClassName="p-2 rounded text-gray-400 hover:text-green-300 hover:bg-green-500/10 transition-colors fortress-focus"
              />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500/50" />
            <input
              type="search"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-2.5 bg-[#07110c] border border-green-500/15 rounded text-green-100 placeholder-green-500/35 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50 text-xs font-mono uppercase tracking-[0.12em] transition-all"
            />
          </div>
          <Button
            onClick={() => setShowUserSearch(true)}
            size="sm"
            className="bg-green-500 hover:bg-green-400 text-black px-3 rounded h-[42px] shadow-none"
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

      {/* Tabs */}
      <div className="px-3 py-2 border-b border-green-500/15">
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab('chats')}
            className={`py-2 px-2 text-xs font-medium rounded transition-all flex items-center justify-center gap-1.5 border font-mono uppercase tracking-[0.12em] ${
              activeTab === 'chats'
                ? 'bg-green-500/15 text-green-300 border-green-500/50'
                : 'text-green-500/55 border-green-500/15 hover:text-green-300 hover:bg-green-500/10'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`py-2 px-2 text-xs font-medium rounded transition-all flex items-center justify-center gap-1.5 border font-mono uppercase tracking-[0.12em] ${
              activeTab === 'teams'
                ? 'bg-green-500/15 text-green-300 border-green-500/50'
                : 'text-green-500/55 border-green-500/15 hover:text-green-300 hover:bg-green-500/10'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-2 text-xs font-medium rounded transition-all flex items-center justify-center gap-1.5 border font-mono uppercase tracking-[0.12em] ${
              activeTab === 'security'
                ? 'bg-green-500/15 text-green-300 border-green-500/50'
                : 'text-green-500/55 border-green-500/15 hover:text-green-300 hover:bg-green-500/10'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
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
      <div className="p-3 border-t border-green-500/15 space-y-2">
        {/* Panic Mode - Only visible for high-risk users */}
        {isFeatureVisible('panic-mode') && (
          <div className="p-3 bg-red-950/20 border border-red-800/30 rounded">
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
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#07110c] hover:bg-green-500/10 rounded text-green-400/70 hover:text-green-300 font-mono uppercase tracking-[0.14em] transition-all text-xs border border-green-500/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Seal Session / Sign Out</span>
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
