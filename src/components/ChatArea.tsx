
import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { NotificationSettings } from './NotificationSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ChatHeader } from './ChatHeader';
import { MessageInput } from './MessageInput';
import { contactInfo } from '@/constants/contactInfo';
import { useChatMessages } from '@/hooks/useChatMessages';
import { MessageSquare, Search } from 'lucide-react';

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

  // If no active chat is selected, show welcome screen
  if (!activeChat) {
    return (
      <div className="flex flex-col bg-gray-900 min-h-screen w-full">
        {/* Header for mobile */}
        <div className="sticky top-0 z-30 bg-gray-800/95 backdrop-blur-sm md:hidden">
          <div className="p-4 flex items-center justify-between">
            <button
              onClick={onToggleSidebar}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">SecureChat</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </div>

        {/* Welcome content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <MessageSquare className="w-16 h-16 text-gray-600" />
                <Search className="w-6 h-6 text-green-500 absolute -top-1 -right-1" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Welcome to SecureChat
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Start a secure conversation by searching for users in the sidebar. 
              All messages are end-to-end encrypted for your privacy.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-300 flex items-center">
                <Search className="w-4 h-4 mr-2 text-green-500" />
                Use the search button in the sidebar to find and connect with other users
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
