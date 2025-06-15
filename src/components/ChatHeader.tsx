
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
    <div className="p-3 md:p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0">
            {contact?.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white text-sm md:text-base truncate">{contact?.name}</h2>
            <div className="flex flex-col md:flex-row md:items-center md:space-x-2">
              <p className="text-xs md:text-sm text-gray-300 truncate">{contact?.status}</p>
              <div className="flex items-center space-x-1 mt-1 md:mt-0">
                <Lock className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500 flex-shrink-0" />
                <span className="text-xs text-green-500 font-mono">End-to-end encrypted</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
          <button
            onClick={() => onStartCall('voice')}
            className="p-1.5 md:p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Voice Call"
          >
            <Phone className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => onStartCall('video')}
            className="p-1.5 md:p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Video Call"
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={onShowNotificationSettings}
            className="p-1.5 md:p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Notification Settings"
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button className="p-1.5 md:p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
