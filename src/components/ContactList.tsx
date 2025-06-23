
import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ContactListProps {
  activeChat: string;
  onChatSelect: (chatId: string) => void;
  searchQuery: string;
  includeDirectMessages?: boolean;
}

export const ContactList = ({ 
  activeChat, 
  onChatSelect, 
  searchQuery,
  includeDirectMessages = false 
}: ContactListProps) => {
  const { conversations, switchToConversation } = useDirectMessages();
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);

  // Filter contacts based on search query
  useEffect(() => {
    let allContacts: any[] = [];

    if (includeDirectMessages) {
      const directConversations = conversations.map(conv => {
        const otherParticipant = conv.participants?.find(p => p.user_id !== conv.id);
        
        return {
          id: conv.id,
          name: `Direct Chat ${conv.id.substring(0, 8)}`,
          status: 'online',
          lastMessage: conv.last_message_preview || 'No messages yet',
          time: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '',
          avatar: '',
          type: 'direct',
          conversationId: conv.id
        };
      });
      allContacts = [...directConversations];
    }

    if (searchQuery.trim()) {
      const filtered = allContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(allContacts);
    }
  }, [searchQuery, conversations, includeDirectMessages]);

  const handleContactClick = (contact: any) => {
    if (contact.type === 'direct') {
      switchToConversation(contact.conversationId);
      onChatSelect(contact.conversationId);
    } else {
      onChatSelect(contact.id);
    }
  };

  const getContactInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="p-2">
      {filteredContacts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {includeDirectMessages 
              ? "No conversations yet. Search for users to start chatting!" 
              : "No contacts found"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleContactClick(contact)}
              className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                activeChat === contact.id || activeChat === contact.conversationId
                  ? 'bg-green-500/20 border-l-2 border-green-500'
                  : 'hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="bg-gray-600 text-white text-sm">
                      {getContactInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Status indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                    contact.status === 'online' ? 'bg-green-500' : 
                    contact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-white truncate">{contact.name}</h3>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3 text-blue-400" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {contact.time && (
                        <span className="text-xs text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {contact.time}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 truncate mt-1">
                    {contact.lastMessage}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
