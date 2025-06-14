
import React, { useState } from 'react';
import { Phone, Video, MoreVertical, Shield, Lock, Send, Paperclip, Smile } from 'lucide-react';
import { MessageList } from './MessageList';

interface ChatAreaProps {
  activeChat: string;
  onStartCall: (type: 'voice' | 'video') => void;
}

const contactInfo = {
  'alice-johnson': { name: 'Alice Johnson', status: 'Online • Last seen now', avatar: 'AJ' },
  'bob-smith': { name: 'Bob Smith', status: 'Online • Last seen 5 min ago', avatar: 'BS' },
  'team-alpha': { name: 'Team Alpha', status: '12 members • 8 online', avatar: 'TA' },
  'sarah-wilson': { name: 'Sarah Wilson', status: 'Last seen 2 hours ago', avatar: 'SW' }
};

export const ChatArea = ({ activeChat, onStartCall }: ChatAreaProps) => {
  const [message, setMessage] = useState('');
  const contact = contactInfo[activeChat as keyof typeof contactInfo];

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('Sending encrypted message:', message);
      setMessage('');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Header */}
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
            <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList activeChat={activeChat} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type an encrypted message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-300 hover:text-white transition-colors">
              <Smile className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleSendMessage}
            className="p-3 bg-green-500 hover:bg-green-600 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!message.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center space-x-1 text-xs text-green-500">
            <Shield className="w-3 h-3" />
            <span>Messages are secured with military-grade encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};
