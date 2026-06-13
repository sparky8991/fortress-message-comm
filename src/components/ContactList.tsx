
import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
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
  verified: boolean;
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
        const lastMessage = conv.last_message_preview || 'NO TRAFFIC YET';
        const verified = !!otherParticipant?.profiles?.verified;

        return {
          id: conv.id,
          name: participantName,
          status: 'online',
          lastMessage,
          time: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
          avatar: participantAvatar,
          type: 'direct',
          conversationId: conv.id,
          unreadCount: conv.unread_count || 0,
          verified
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
    <div className="py-0">
      {filteredContacts.length === 0 ? (
        <div className="px-5 py-9 text-center font-mono text-[#76897D]">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-45" />
          <p className="text-[9px] uppercase leading-relaxed tracking-[0.18em]">
            {includeDirectMessages 
              ? "NO TRAFFIC YET. SEARCH CHANNELS TO OPEN COMMS."
              : "NO CHANNELS FOUND"
            }
          </p>
        </div>
      ) : (
        <div>
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleContactClick(contact)}
              className={`group cursor-pointer border-l-2 px-3.5 py-2.5 transition-colors ${
                activeChat === contact.id || activeChat === contact.conversationId
                  ? 'border-[#36E27B] bg-[#0E2A1A]'
                  : 'border-transparent hover:bg-[#101814]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative flex-none">
                  <Avatar className="h-[38px] w-[38px] rounded-sm">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="rounded-sm border border-[#1E5C3C] bg-[#12301F] font-mono text-[13px] font-black text-[#7BEFA9]">
                      {getContactInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Status indicator */}
                  <div className={`absolute -bottom-[3px] -right-[3px] h-[9px] w-[9px] rounded-full border-2 border-[#07100b] ${
                    contact.status === 'online' ? 'bg-[#36E27B]' :
                    contact.status === 'away' ? 'bg-[#F2B43C]' : 'bg-[#4A5A50]'
                  }`} />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <div className="flex min-w-0 items-baseline gap-1.5">
                      <h3 className="truncate font-mono text-[12px] font-black text-[#ECF7F0]">{contact.name}</h3>
                      <span
                        className={`flex-none font-mono text-[8px] font-black uppercase tracking-[0.12em] ${
                          contact.verified ? 'text-[#36E27B]' : 'text-[#F2B43C]'
                        }`}
                      >
                        {contact.verified ? 'VER' : 'UNVER'}
                      </span>
                    </div>
                    <div className="ml-auto flex flex-none items-center gap-1.5">
                      {contact.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#36E27B] px-1.5 font-mono text-[8px] font-black text-[#06130B]">
                          {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                        </span>
                      )}
                      {contact.time && (
                        <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#4A5A50]">
                          {contact.time}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[#76897D]">
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
