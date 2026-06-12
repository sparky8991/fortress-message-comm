
import React from 'react';
import { Phone, Video, Lock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ContactInfo {
  name: string;
  status: string;
  avatar: string;
}

interface ChatHeaderProps {
  contact: ContactInfo;
  onStartCall: (type: 'voice' | 'video') => void;
  onToggleSidebar?: () => void;
}

export const ChatHeader = ({ contact, onStartCall, onToggleSidebar }: ChatHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="p-3 border-b border-gray-700/80 bg-gray-800/95 backdrop-blur-sm shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Avatar as sidebar toggle on mobile */}
          <button
            onClick={isMobile ? onToggleSidebar : undefined}
            className={`w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-green-500/30 transition-all duration-200 ${
              isMobile
                ? 'hover:scale-105 active:scale-95 cursor-pointer hover:shadow-green-500/40'
                : 'cursor-default'
            }`}
            title={isMobile ? "Open sidebar" : undefined}
            aria-label={isMobile ? "Open sidebar" : "Contact avatar"}
          >
            {contact?.avatar}
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white text-base truncate">{contact?.name}</h2>
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
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Voice Call"
            aria-label="Start voice call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStartCall('video')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Video Call"
            aria-label="Start video call"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
