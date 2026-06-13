
import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { auth } from '@/integrations/firebase/client';
import { Conversation } from '@/services/conversationService';

interface ContactListProps {
  activeChat: string;
  onChatSelect: (chatId: string) => void;
  searchQuery: string;
  includeDirectMessages?: boolean;
}

type ContactItem = {
  id: string;
  name: string;
  status: string;
  lastMessage: string;
  time: string;
  avatar: string;
  type: 'direct';
  conversationId: string;
  unreadCount: number;
};

export const ContactList = ({
  activeChat,
  onChatSelect,
  searchQuery,
  includeDirectMessages = false
}: ContactListProps) => {
  const { conversations, switchToConversation } = useDirectMessages();
  const [filteredContacts, setFilteredContacts] = useState<ContactItem[]>([]);

  // Filter contacts based on search query
  useEffect(() => {
    let allContacts: ContactItem[] = [];
    const currentUserId = auth.currentUser?.uid;

    if (includeDirectMessages) {
      const directConversations = conversations.map((conv: Conversation): ContactItem => {
        // Find the other participant (not the current user)
        const otherParticipant = conv.participants?.find(p => p.user_id !== currentUserId);
        const participantName = otherParticipant?.profiles?.username ||
                               otherParticipant?.profiles?.full_name ||
                               'Unknown User';
        const participantAvatar = otherParticipant?.profiles?.avatar_url || '';

        return {
          id: conv.id,
          name: participantName,
          status: 'online',
          lastMessage: conv.last_message_preview || 'No messages yet',
          time: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
          avatar: participantAvatar,
          type: 'direct',
          conversationId: conv.id,
          unreadCount: conv.unread_count || 0
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

  const handleContactClick = (contact: ContactItem) => {
    switchToConversation(contact.conversationId);
    onChatSelect(contact.conversationId);
  };

  const getContactInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="p-2">
      {filteredContacts.length === 0 ? (
        <div className="text-center py-10 text-green-500/55 font-mono">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-45" />
          <p className="text-xs leading-relaxed">
            {includeDirectMessages 
              ? "No traffic yet. Search for users to open a channel."
              : "No channels found"
            }
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleContactClick(contact)}
              className={`p-3 rounded cursor-pointer transition-colors group border-l-2 ${
                activeChat === contact.id || activeChat === contact.conversationId
                  ? 'bg-green-500/13 border-green-400'
                  : 'border-transparent hover:bg-green-500/7'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="w-10 h-10 rounded">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="rounded bg-green-500/15 border border-green-500/25 text-green-200 text-sm font-mono font-bold">
                      {getContactInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Status indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-[#06100b] ${
                    contact.status === 'online' ? 'bg-green-500' : 
                    contact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-mono font-bold text-sm text-white truncate">{contact.name}</h3>
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-green-400/70 font-mono">VER</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {contact.unreadCount > 0 && (
                        <span className="min-w-[18px] h-5 px-1.5 bg-green-500 text-black text-xs font-bold rounded flex items-center justify-center">
                          {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                        </span>
                      )}
                      {contact.time && (
                        <span className="text-[10px] text-green-500/55 flex items-center font-mono">
                          <Clock className="w-3 h-3 mr-1" />
                          {contact.time}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-green-500/55 truncate mt-1 font-mono uppercase">
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
