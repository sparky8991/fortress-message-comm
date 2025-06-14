
import React, { useState } from 'react';
import { Search, Settings, Shield, Lock, Users, Plus } from 'lucide-react';
import { ContactList } from './ContactList';
import { SecurityPanel } from './SecurityPanel';

interface SidebarProps {
  activeChat: string;
  onChatSelect: (chatId: string) => void;
}

export const Sidebar = ({ activeChat, onChatSelect }: SidebarProps) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'security'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-green-500" />
            <h1 className="text-xl font-bold text-white">SecureChat</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-500 font-medium">ENCRYPTED</span>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'chats'
              ? 'text-green-500 border-b-2 border-green-500 bg-gray-750'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Chats
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'security'
              ? 'text-green-500 border-b-2 border-green-500 bg-gray-750'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Security
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chats' ? (
          <ContactList 
            activeChat={activeChat}
            onChatSelect={onChatSelect}
            searchQuery={searchQuery}
          />
        ) : (
          <SecurityPanel />
        )}
      </div>
    </div>
  );
};
