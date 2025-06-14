
import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'me' | 'contact';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  encrypted: boolean;
  sentAt?: Date;
  attachment?: {
    name: string;
    url: string;
    type: string;
  };
}

interface NotificationSettings {
  unreadReminderEnabled: boolean;
  unreadReminderTime: number; // in minutes
}

export const useNotifications = (messages: Message[], settings: NotificationSettings) => {
  const [notifiedMessages, setNotifiedMessages] = useState<Set<string>>(new Set());

  const checkUnreadMessages = useCallback(() => {
    if (!settings.unreadReminderEnabled) return;

    const now = new Date();
    const unreadMessages = messages.filter(message => 
      message.sender === 'me' && 
      message.status !== 'read' &&
      !notifiedMessages.has(message.id)
    );

    unreadMessages.forEach(message => {
      // For demo purposes, we'll use timestamp parsing or assume recent messages
      const messageTime = message.sentAt || new Date(Date.now() - Math.random() * 10 * 60 * 1000); // Random time within last 10 minutes for demo
      const timeDiff = now.getTime() - messageTime.getTime();
      const minutesPassed = timeDiff / (1000 * 60);

      if (minutesPassed >= settings.unreadReminderTime) {
        toast({
          title: 'Unread Message',
          description: `Your message hasn't been read for ${Math.floor(minutesPassed)} minutes: "${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}"`,
          variant: 'default',
        });

        setNotifiedMessages(prev => new Set([...prev, message.id]));
      }
    });
  }, [messages, settings, notifiedMessages]);

  useEffect(() => {
    const interval = setInterval(checkUnreadMessages, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkUnreadMessages]);

  const markAsNotified = (messageId: string) => {
    setNotifiedMessages(prev => new Set([...prev, messageId]));
  };

  const clearNotifications = () => {
    setNotifiedMessages(new Set());
  };

  return {
    markAsNotified,
    clearNotifications
  };
};
