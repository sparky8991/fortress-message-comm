
import React from 'react';
import { Phone, Video, MoreVertical, Lock, Settings } from 'lucide-react';

interface ContactInfo {
  name: string;
  status: string;
  avatar: string;
}

interface ChatHeaderProps {
  contact: ContactInfo;
  onStartCall: (type: 'voice' | 'video') => void;
  onShowNotificationSettings: () => void;
}

export const ChatHeader = ({ contact, onStartCall, onShowNotificationSettings }: ChatHeaderProps) => {
  return (
    <div className="p-4 border-b border-gray-700/80 bg-gray-800/95 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 min-w-0 flex-1 ml-12 md:ml-0">
          <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-green-500/30">
            {contact?.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white text-lg truncate mb-1">{contact?.name}</h2>
            <div className="flex flex-col space-y-1.5">
              <p className="text-sm text-gray-300 truncate">{contact?.status}</p>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-xs text-green-500 font-mono font-medium">End-to-end encrypted</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => onStartCall('voice')}
            className="p-3 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Voice Call"
            aria-label="Start voice call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => onStartCall('video')}
            className="p-3 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Video Call"
            aria-label="Start video call"
          >
            <Video className="w-5 h-5" />
          </button>
          <button 
            onClick={onShowNotificationSettings}
            className="p-3 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Notification Settings"
            aria-label="Open notification settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            className="p-3 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="More options"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
