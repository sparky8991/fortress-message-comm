
import React, { useState, useMemo, useEffect } from 'react';
import { MessageList } from './MessageList';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ChatHeader } from './ChatHeader';
import { MessageInput } from './MessageInput';
import { contactInfo } from '@/constants/contactInfo';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { auth } from '@/integrations/firebase/client';
import { MessageSquare, Search } from 'lucide-react';
import { Message } from '@/constants/initialMessages';

type MessageMetadata = Record<string, unknown> & {
  duration?: number;
  isVoiceMessage?: boolean;
  mimeType?: string;
  originalName?: string;
  shareCode?: string;
  burnAfterRead?: boolean;
  burnAfterReadSeconds?: number;
  burnOpenedAt?: unknown;
  burnExpiresAt?: unknown;
  burnOpenedBy?: string | null;
  trafficMark?: 'normal' | 'sensitive' | 'locked';
};

interface ChatAreaProps {
  activeChat: string;
  onStartCall: (type: 'voice' | 'video') => void;
  onToggleSidebar?: () => void;
}

export const ChatArea = ({ activeChat, onStartCall, onToggleSidebar }: ChatAreaProps) => {
  const { settings: userSettings } = useUserSettings();
  const {
    conversations,
    messages,
    sendMessageToConversation,
    switchToConversation
  } = useDirectMessages();
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    messageText: string;
    sender: string;
  } | null>(null);

  // Fallback settings for backward compatibility
  const fallbackSettings = {
    unreadReminderEnabled: true,
    reminderTimerEnabled: true,
    unreadReminderTime: 5
  };
  useEffect(() => {
    if (activeChat) {
      switchToConversation(activeChat);
    }
  }, [activeChat, switchToConversation]);

  // Get contact info - either from static contactInfo or from conversation participants
  const contact = useMemo(() => {
    // First try static contact info (for team chats, etc.)
    const staticContact = contactInfo[activeChat as keyof typeof contactInfo];
    if (staticContact) return staticContact;

    // For direct conversations, get the other participant's info
    const currentUserId = auth.currentUser?.uid;
    const conversation = conversations.find(c => c.id === activeChat);

    if (conversation && conversation.participants) {
      const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
      if (otherParticipant?.profiles) {
        const name = otherParticipant.profiles.username || otherParticipant.profiles.full_name || 'Unknown User';
        return {
          name: name,
          status: 'End-to-end encrypted',
          avatar: name.charAt(0).toUpperCase(),
          tacticalId: otherParticipant.profiles.tacticalId || ''
        };
      }
    }

    // Default fallback
    return {
      name: 'Secure Chat',
      status: 'End-to-end encrypted',
      avatar: '🔒'
    };
  }, [activeChat, conversations]);

  const currentMessages: Message[] = useMemo(() => {
    const currentUserId = auth.currentUser?.uid;

    return messages.map((message) => ({
      id: message.id,
      text: message.content,
      timestamp: new Date(message.sent_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      sender: message.sender_id === currentUserId ? 'me' : 'contact',
      status: message.read_at ? 'read' : 'sent',
      encrypted: message.encrypted,
      metadata: message.metadata || undefined,
      sentAt: new Date(message.sent_at),
      attachment: message.attachment_url ? {
        name: message.attachment_name || 'Attachment',
        url: message.attachment_url,
        type: message.attachment_type || 'application/octet-stream',
        metadata: message.metadata || undefined
      } : undefined,
      replyTo: message.reply_to_id ? {
        messageId: message.reply_to_id,
        messageText: 'Reply',
        sender: 'Contact'
      } : undefined
    }));
  }, [messages]);

  // Use settings from database if available, otherwise use fallback
  const currentNotificationSettings = userSettings?.notification_settings || fallbackSettings;

  useNotifications(currentMessages, currentNotificationSettings);

  // If no active chat is selected, show welcome screen
  if (!activeChat) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden fortress-shell">
        {/* Header for mobile */}
        <div className="sticky top-0 z-30 border-b border-[#1C2B22] bg-[#07100b]/95 backdrop-blur-sm md:hidden">
          <div className="p-4 flex items-center justify-between">
            <button
              onClick={onToggleSidebar}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="ft-head font-semibold text-white">SecureChat</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </div>

        {/* Welcome content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <MessageSquare className="h-16 w-16 text-[#36E27B]/35" />
                <Search className="absolute -right-1 -top-1 h-6 w-6 text-[#36E27B]" />
              </div>
            </div>
            <h2 className="mb-4 font-mono ft-head font-black uppercase tracking-[0.16em] text-[#ECF7F0]">
              SecureChat Fortress
            </h2>
            <p className="mb-6 font-mono ft-body leading-relaxed text-[#76897D]">
              Open a protected channel by searching for users in the sidebar.
              Lock sensitive payloads and use burn-after-read when the traffic should not linger.
            </p>
            <div className="fortress-panel-muted rounded p-4">
              <p className="flex items-center font-mono ft-body text-[#7BEFA9]">
                <Search className="mr-2 h-4 w-4 text-[#36E27B]" />
                Use the sidebar search button to find and connect with operators.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleStartNewGroup = (contactName: string) => {
    console.log(`Starting new group with ${contactName}`);
  };

  const handleReply = (messageId: string, messageText: string) => {
    const originalMessage = currentMessages.find(message => message.id === messageId);
    if (!originalMessage) return;

    setReplyingTo({
      messageId,
      messageText,
      sender: originalMessage.sender === 'me' ? 'You' : contact.name
    });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = async (
    messageText: string,
    attachmentFile: File | null,
    encryptionMetadata?: MessageMetadata | null,
    replyTo?: typeof replyingTo
  ) => {
    if (!activeChat) return;

    await sendMessageToConversation(
      activeChat,
      messageText,
      attachmentFile || undefined,
      encryptionMetadata || undefined,
      replyTo?.messageId
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden fortress-shell">
      {/* Header - Always visible at top */}
        <div className="sticky top-0 z-30 bg-[#0C120F]/95 backdrop-blur-sm">
        <ChatHeader
          contact={contact}
          onStartCall={onStartCall}
          onToggleSidebar={onToggleSidebar}
        />
      </div>

      {/* Messages - Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-24">
        <MessageList 
          messages={currentMessages} 
          onReply={handleReply}
          onSendMessage={handleSendMessage}
          onStartNewGroup={handleStartNewGroup}
          contactName={contact?.name || 'Contact'}
        />
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#0C120F]/95 backdrop-blur-sm md:left-80">
        <MessageInput 
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      </div>

    </div>
  );
};
