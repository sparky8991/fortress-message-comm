import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { NotificationSettings } from './NotificationSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ChatHeader } from './ChatHeader';
import { MessageInput } from './MessageInput';
import { contactInfo } from '@/constants/contactInfo';
import { useChatMessages } from '@/hooks/useChatMessages';

interface ChatAreaProps {
  activeChat: string;
  onStartCall: (type: 'voice' | 'video') => void;
  onToggleSidebar?: () => void;
}

export const ChatArea = ({ activeChat, onStartCall, onToggleSidebar }: ChatAreaProps) => {
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const { settings: userSettings } = useUserSettings();
  
  // Fallback settings for backward compatibility
  const [fallbackSettings, setFallbackSettings] = useState({
    unreadReminderEnabled: true,
    reminderTimerEnabled: true,
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
  
  // Use settings from database if available, otherwise use fallback
  const currentNotificationSettings = userSettings?.notification_settings || fallbackSettings;
  
  useNotifications(currentMessages, currentNotificationSettings);

  const handleSaveNotificationSettings = (newSettings: typeof fallbackSettings) => {
    // This is now handled by the NotificationSettings component via the userSettings hook
    // Keep this for backward compatibility
    setFallbackSettings(newSettings);
  };

  return (
    <div className="flex flex-col bg-gray-900 min-h-screen w-full">
      {/* Header - Always visible at top */}
      <div className="sticky top-0 z-30 bg-gray-800/95 backdrop-blur-sm">
        <ChatHeader
          contact={contact}
          onStartCall={onStartCall}
          onShowNotificationSettings={() => setShowNotificationSettings(true)}
          onToggleSidebar={onToggleSidebar}
        />
      </div>

      {/* Messages - Scrollable content area */}
      <div className="flex-1 pb-24">
        <MessageList 
          messages={currentMessages} 
          onReply={handleReply}
          onSendMessage={handleSendMessage}
          onStartNewGroup={handleStartNewGroup}
          contactName={contact?.name || 'Contact'}
        />
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 md:left-80 z-20 bg-gray-800/95 backdrop-blur-sm">
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
        settings={currentNotificationSettings}
        onSave={handleSaveNotificationSettings}
      />
    </div>
  );
};
