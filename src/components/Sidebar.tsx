
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shield, Users, Power, MessageSquare, Plus, AlertTriangle } from 'lucide-react';
import { ContactList } from './ContactList';
import { SecurityPanel } from './SecurityPanel';
import { UserSearchDialog } from './UserSearchDialog';
import { EditCallSignDialog } from './EditCallSignDialog';
import { HoldPanicButton } from './HoldPanicButton';
import { auth, db } from '@/integrations/firebase/client';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { TeamList } from './TeamList';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useUserRisk } from '@/contexts/UserRiskContext';
import { Button } from '@/components/ui/button';
import { StatusUser } from '@/services/statusService';
import { AppSettingsMenu } from './AppSettingsMenu';
import { FORTRESS_VERSION } from '@/lib/fortress';

interface SidebarProps {
  activeChat: string;
  onChatSelect: (chatId: string) => void;
  onViewStatus?: (statusUser: StatusUser) => void;
  onCreateStatus?: () => void;
  statusRefreshKey?: number;
}

const formatUtcTime = () =>
  `${new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date())}Z UTC`;

export const Sidebar = ({
  activeChat,
  onChatSelect,
}: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'teams' | 'security'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showEditCallSign, setShowEditCallSign] = useState(false);
  const [callSign, setCallSign] = useState<string>('');
  const [callSignChangesThisYear, setCallSignChangesThisYear] = useState(0);
  const [utcTime, setUtcTime] = useState(formatUtcTime());
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
            const data = snap.data();
            setCallSign(data.callSign || '');
            setCallSignChangesThisYear(data.callSignChangesThisYear || 0);
          }
        });
        return () => unsubscribeProfile();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setUtcTime(formatUtcTime()), 1000);
    return () => window.clearInterval(interval);
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
    <div className="flex h-full w-80 flex-col border-r border-[#1C2B22] bg-[#0C120F] font-mono text-[#DCEAE1]">
      <div className="flex-none border-b border-[#1C2B22] px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[30px] w-[30px] flex-none place-items-center rounded-sm border border-[#36E27B] bg-[#36E27B]/10">
            <Shield className="h-4 w-4 text-[#36E27B]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-mono text-[14px] font-extrabold uppercase leading-none tracking-[2px] text-[#ECF7F0]">
              SECURECHAT
            </h1>
            <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[1.5px] text-[#76897D]">
              FORTRESS TERMINAL {FORTRESS_VERSION}
            </div>
          </div>
          <div className="flex flex-none items-center gap-1.5 rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#36E27B] shadow-[0_0_10px_rgba(54,226,123,0.65)]" />
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#36E27B]">SECURE</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[1px] text-[#4A5A50]">
          <span className="text-[#76897D]">{utcTime}</span>
          <span>X25519 · AES-256-GCM</span>
        </div>
      </div>

      {callSign && (
        <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-sm border border-[#1C2B22] bg-[#101814] px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-sm border border-[#1E5C3C] bg-[#12301F]">
              <span className="font-mono text-[14px] font-black text-[#7BEFA9]">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase leading-none tracking-[0.22em] text-[#76897D]">CALL SIGN</div>
              <div className="mt-1 truncate font-mono text-[14px] font-black leading-none tracking-[0.08em] text-[#ECF7F0]">
                {callSign}
                <span className="ml-1 text-[11px] text-[#36E27B]">✓</span>
              </div>
            </div>
          </div>
          <div className="flex flex-none items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#36E27B]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#76897D]">ONLINE</span>
          </div>
          <AppSettingsMenu
            triggerClassName="grid h-7 w-7 flex-none place-items-center rounded-sm border border-[#1C2B22] bg-transparent text-[#76897D] transition-colors hover:border-[#1E5C3C] hover:text-[#36E27B] fortress-focus"
            profile={{
              callSign,
              email: auth.currentUser?.email || '',
              avatarInitials: initials,
              callSignChangesThisYear,
            }}
            onEditCallSign={() => setShowEditCallSign(true)}
          />
        </div>
      )}

      <div className="mx-3 mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#76897D]" />
          <input
            type="search"
            placeholder="SEARCH CHANNELS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            className="h-[34px] w-full rounded-sm border border-[#1C2B22] bg-[#0F1612] pl-9 pr-3 font-mono text-[12px] uppercase tracking-[0.1em] text-[#DCEAE1] placeholder:text-[#76897D]/60 transition-colors focus:border-[#1E5C3C] focus:outline-none focus:ring-1 focus:ring-[#36E27B]/25"
          />
        </div>
        <Button
          onClick={() => setShowUserSearch(true)}
          size="sm"
          className="h-[34px] w-[34px] rounded-sm border border-[#1E5C3C] bg-transparent p-0 text-[#36E27B] shadow-none hover:bg-[#36E27B]/10 hover:text-[#ECF7F0]"
          title="Start new conversation"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mx-3 mt-3 grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex h-7 items-center justify-center gap-1.5 rounded-sm border px-2 font-mono text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
            activeTab === 'chats'
              ? 'border-[#1E5C3C] bg-[#36E27B]/10 text-[#36E27B]'
              : 'border-[#1C2B22] text-[#76897D] hover:border-[#1E5C3C] hover:text-[#DCEAE1]'
          }`}
        >
          <MessageSquare className="h-3 w-3" />
          <span>CHATS</span>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex h-7 items-center justify-center gap-1.5 rounded-sm border px-2 font-mono text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
            activeTab === 'teams'
              ? 'border-[#1E5C3C] bg-[#36E27B]/10 text-[#36E27B]'
              : 'border-[#1C2B22] text-[#76897D] hover:border-[#1E5C3C] hover:text-[#DCEAE1]'
          }`}
        >
          <Users className="h-3 w-3" />
          <span>TEAMS</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex h-7 items-center justify-center gap-1.5 rounded-sm border px-2 font-mono text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
            activeTab === 'security'
              ? 'border-[#1E5C3C] bg-[#36E27B]/10 text-[#36E27B]'
              : 'border-[#1C2B22] text-[#76897D] hover:border-[#1E5C3C] hover:text-[#DCEAE1]'
          }`}
        >
          <Shield className="h-3 w-3" />
          <span>SECURITY</span>
        </button>
      </div>

      {/* Content */}
      <div className="mt-2 flex-1 overflow-y-auto scrollbar-hide">
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
      <div className="flex-none space-y-2 border-t border-[#141E18] p-3">
        {/* Panic Mode - Only visible for high-risk users */}
        {isFeatureVisible('panic-mode') && (
          <div className="rounded-sm border border-[#5C2420] bg-[#8C1D18]/15 p-2.5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-[#FF6B61]" />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#FF6B61]">Emergency</span>
            </div>
            <HoldPanicButton variant="full" />
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-[#1C2B22] bg-transparent px-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#76897D] transition-colors hover:border-[#36513F] hover:text-[#DCEAE1]"
        >
          <Power className="h-3 w-3" />
          <span>SEAL SESSION / SIGN OUT</span>
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
