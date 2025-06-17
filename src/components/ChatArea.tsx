
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
    <div className="flex-1 flex flex-col bg-gray-900 h-full max-w-full min-w-0">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 z-30">
        <ChatHeader
          contact={contact}
          onStartCall={onStartCall}
          onShowNotificationSettings={() => setShowNotificationSettings(true)}
        />
      </div>

      {/* Messages - Scrollable area */}
      <div className="flex-1 overflow-hidden min-w-0">
        <MessageList 
          messages={currentMessages} 
          onReply={handleReply}
          onSendMessage={handleSendMessage}
          onStartNewGroup={handleStartNewGroup}
          contactName={contact?.name || 'Contact'}
        />
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0">
        <MessageInput 
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      </div>

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </div>
  );
};
