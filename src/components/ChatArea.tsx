
import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { NotificationSettings } from './NotificationSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { ChatHeader } from './ChatHeader';
import { MessageInput } from './MessageInput';
import { contactInfo } from '@/constants/contactInfo';
import { useChatMessages } from '@/hooks/useChatMessages';

interface ChatAreaProps {
  activeChat: string;
  onStartCall: (type: 'voice' | 'video') => void;
}

export const ChatArea = ({ activeChat, onStartCall }: ChatAreaProps) => {
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    unreadReminderEnabled: true,
    unreadReminderTime: 5
  });

  const {
    currentMessages,
    replyingTo,
    handleStartNewGroup,
    handleReply,
    handleCancelReply,
    handleSendMessage
  } = useChatMessages(activeChat);

  const contact = contactInfo[activeChat as keyof typeof contactInfo];
  
  useNotifications(currentMessages, notificationSettings);

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      <ChatHeader
        contact={contact}
        onStartCall={onStartCall}
        onShowNotificationSettings={() => setShowNotificationSettings(true)}
      />

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={currentMessages} 
          onReply={handleReply}
          onSendMessage={handleSendMessage}
          onStartNewGroup={handleStartNewGroup}
          contactName={contact?.name || 'Contact'}
        />
      </div>

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </div>
  );
};
