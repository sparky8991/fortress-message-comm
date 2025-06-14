
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
    <div className="p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
            {contact?.avatar}
          </div>
          <div>
            <h2 className="font-semibold text-white">{contact?.name}</h2>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-300">{contact?.status}</p>
              <div className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">End-to-end encrypted</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onStartCall('voice')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => onStartCall('video')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Video className="w-5 h-5" />
          </button>
          <button 
            onClick={onShowNotificationSettings}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Notification Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
