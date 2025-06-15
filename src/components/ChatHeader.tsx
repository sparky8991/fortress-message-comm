
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
    <div className="p-3 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1 ml-12 md:ml-0">
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {contact?.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white text-base truncate">{contact?.name}</h2>
            <div className="flex flex-col space-y-1">
              <p className="text-sm text-gray-300 truncate">{contact?.status}</p>
              <div className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-green-500 flex-shrink-0" />
                <span className="text-xs text-green-500 font-mono">End-to-end encrypted</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={() => onStartCall('voice')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => onStartCall('video')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
          <button 
            onClick={onShowNotificationSettings}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Notification Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
