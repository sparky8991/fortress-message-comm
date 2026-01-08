import React from 'react';
import { MessageSquare, Users, Shield, User, Plus } from 'lucide-react';
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
      badge: totalUnread > 0 ? totalUnread : null
    },
    {
      id: 'teams' as const,
      icon: Users,
      label: 'Teams',
      badge: null
    },
    {
      id: 'security' as const,
      icon: Shield,
      label: 'Security',
      badge: null
    },
    {
      id: 'profile' as const,
      icon: User,
      label: 'Profile',
      badge: null
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
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-40 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id ||
            (tab.id === 'profile' && location.pathname === '/profile-settings');

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all min-w-[64px] min-h-[56px] relative ${
                isActive
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-gray-400 hover:text-gray-300 active:bg-gray-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-green-400' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Floating action button for new chat */}
        {onNewChat && (
          <button
            onClick={onNewChat}
            className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-all"
            aria-label="New chat"
          >
            <Plus className="w-6 h-6 text-black" />
          </button>
        )}
      </div>
    </nav>
  );
};
