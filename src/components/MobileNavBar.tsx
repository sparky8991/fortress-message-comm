import React from 'react';
import { MessageSquare, Users, Shield, User, Plus, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDirectMessages } from '@/hooks/useDirectMessages';

interface MobileNavBarProps {
  activeTab: 'chats' | 'teams' | 'security' | 'profile';
  onTabChange: (tab: 'chats' | 'teams' | 'security' | 'profile') => void;
  onNewChat?: () => void;
}

export const MobileNavBar = ({ activeTab, onTabChange, onNewChat }: MobileNavBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalUnreadCount } = useDirectMessages();

  const totalUnread = getTotalUnreadCount();

  const tabs = [
    {
      id: 'chats' as const,
      icon: MessageSquare,
      label: 'Chats',
      badge: totalUnread > 0 ? totalUnread : null,
      color: 'green'
    },
    {
      id: 'teams' as const,
      icon: Users,
      label: 'Teams',
      badge: null,
      color: 'green'
    },
    {
      id: 'security' as const,
      icon: Shield,
      label: 'Security',
      badge: null,
      color: 'green'
    },
    {
      id: 'profile' as const,
      icon: User,
      label: 'Profile',
      badge: null,
      color: 'green'
    }
  ];

  const handleTabClick = (tabId: typeof activeTab) => {
    if (tabId === 'profile') {
      navigate('/profile-settings');
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-40 safe-area-bottom">
      {/* Floating action button for new chat — bottom-right above the tab bar (no center notch) */}
      {onNewChat && (
        <button
          onClick={onNewChat}
          className="absolute -top-7 right-4 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 active:scale-95 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/30 transition-all z-10"
          aria-label="New chat"
        >
          <Plus className="w-6 h-6 text-black" />
        </button>
      )}

      <div className="flex items-center justify-around px-1 pt-2 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id ||
            (tab.id === 'profile' && location.pathname === '/profile-settings');

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all min-w-[60px] min-h-[52px] relative ${
                isActive
                  ? 'text-green-400'
                  : 'text-gray-500 hover:text-gray-400 active:bg-gray-800/50'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-500 rounded-full" />
              )}

              <div className="relative">
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-green-500/10' : ''}`}>
                  <Icon className={`w-5 h-5 transition-all ${isActive ? 'scale-110' : ''}`} />
                </div>
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-green-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium transition-colors ${isActive ? 'text-green-400' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
