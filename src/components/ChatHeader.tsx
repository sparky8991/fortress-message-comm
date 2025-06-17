
import React from 'react';
import { Phone, Video, MoreVertical, Lock, Settings, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ContactInfo {
  name: string;
  status: string;
  avatar: string;
}

interface ChatHeaderProps {
  contact: ContactInfo;
  onStartCall: (type: 'voice' | 'video') => void;
  onShowNotificationSettings: () => void;
  onToggleSidebar?: () => void;
}

export const ChatHeader = ({ contact, onStartCall, onShowNotificationSettings, onToggleSidebar }: ChatHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="p-2 md:p-3 border-b border-gray-700/80 bg-gray-800/95 backdrop-blur-sm shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
          {/* Mobile hamburger menu integrated into header */}
          {isMobile && onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="p-1.5 bg-gray-700/80 hover:bg-gray-600/80 rounded-lg text-white transition-all duration-200 flex-shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
          )}
          
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm md:text-lg flex-shrink-0 shadow-lg shadow-green-500/30">
            {contact?.avatar}
          </div>
          
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white text-sm md:text-base truncate">{contact?.name}</h2>
            {isMobile ? (
              // Compact mobile layout - just encryption status
              <div className="flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5 text-green-500" />
                <span className="text-xs text-green-500 font-mono">SECURE</span>
              </div>
            ) : (
              // Full desktop layout
              <div className="flex flex-col space-y-1">
                <p className="text-xs text-gray-300 truncate">{contact?.status}</p>
                <div className="flex items-center space-x-1.5">
                  <div className="relative">
                    <Lock className="w-3 h-3 text-green-500 flex-shrink-0 animate-pulse" />
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-xs text-green-500 font-mono font-semibold tracking-wide">End-to-end encrypted</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={() => onStartCall('voice')}
            className="p-1.5 md:p-2.5 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-lg md:rounded-xl transition-all duration-200 min-h-[32px] min-w-[32px] md:min-h-[40px] md:min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Voice Call"
            aria-label="Start voice call"
          >
            <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button
            onClick={() => onStartCall('video')}
            className="p-1.5 md:p-2.5 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-lg md:rounded-xl transition-all duration-200 min-h-[32px] min-w-[32px] md:min-h-[40px] md:min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Video Call"
            aria-label="Start video call"
          >
            <Video className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          {!isMobile && (
            <button 
              onClick={onShowNotificationSettings}
              className="p-2.5 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
              title="Notification Settings"
              aria-label="Open notification settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button 
            className="p-1.5 md:p-2.5 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-lg md:rounded-xl transition-all duration-200 min-h-[32px] min-w-[32px] md:min-h-[40px] md:min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="More options"
            aria-label="More options"
          >
            <MoreVertical className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
