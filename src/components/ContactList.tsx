
import React from 'react';
import { Shield, Clock, Check, CheckCheck } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  encrypted: boolean;
  messageStatus: 'sent' | 'delivered' | 'read';
}

interface ContactListProps {
  activeChat: string;
  onChatSelect: (chatId: string) => void;
  searchQuery: string;
}

const contacts: Contact[] = [
  {
    id: 'alice-johnson',
    name: 'Alice Johnson',
    avatar: 'AJ',
    lastMessage: 'The encrypted files have been sent securely',
    timestamp: '2 min ago',
    unread: 2,
    online: true,
    encrypted: true,
    messageStatus: 'read'
  },
  {
    id: 'bob-smith',
    name: 'Bob Smith',
    avatar: 'BS',
    lastMessage: 'Roger that, mission parameters confirmed',
    timestamp: '15 min ago',
    unread: 0,
    online: true,
    encrypted: true,
    messageStatus: 'delivered'
  },
  {
    id: 'team-alpha',
    name: 'Team Alpha',
    avatar: 'TA',
    lastMessage: 'Secure channel established for tomorrow',
    timestamp: '1 hour ago',
    unread: 5,
    online: false,
    encrypted: true,
    messageStatus: 'sent'
  },
  {
    id: 'sarah-wilson',
    name: 'Sarah Wilson',
    avatar: 'SW',
    lastMessage: 'Encryption keys updated successfully',
    timestamp: '3 hours ago',
    unread: 0,
    online: false,
    encrypted: true,
    messageStatus: 'read'
  }
];

export const ContactList = ({ activeChat, onChatSelect, searchQuery }: ContactListProps) => {
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMessageStatusIcon = (status: Contact['messageStatus']) => {
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="overflow-y-auto">
      {filteredContacts.map((contact) => (
        <div
          key={contact.id}
          onClick={() => onChatSelect(contact.id)}
          className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-750 ${
            activeChat === contact.id ? 'bg-gray-750 border-l-4 border-l-green-500' : ''
          }`}
        >
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                {contact.avatar}
              </div>
              {contact.online && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-gray-800 rounded-full"></div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-white truncate">{contact.name}</h3>
                  {contact.encrypted && (
                    <Shield className="w-3 h-3 text-green-500" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {getMessageStatusIcon(contact.messageStatus)}
                  <span className="text-xs text-gray-400">{contact.timestamp}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-300 truncate">{contact.lastMessage}</p>
                {contact.unread > 0 && (
                  <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {contact.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
