import React, { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { NotificationSettings } from './NotificationSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { ChatHeader } from './ChatHeader';
import { MessageInput } from './MessageInput';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'me' | 'contact';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  encrypted: boolean;
  sentAt: Date;
  attachment?: {
    name: string;
    url: string;
    type: string;
    metadata?: any;
  };
  replyTo?: {
    messageId: string;
    messageText: string;
    sender: string;
  };
}

interface ChatAreaProps {
  activeChat: string;
  onStartCall: (type: 'voice' | 'video') => void;
}

const contactInfo = {
  'alice-johnson': { name: 'Alice Johnson', status: 'Online • Last seen now', avatar: 'AJ' },
  'bob-smith': { name: 'Bob Smith', status: 'Online • Last seen 5 min ago', avatar: 'BS' },
  'team-alpha': { name: 'Team Alpha', status: '12 members • 8 online', avatar: 'TA' },
  'sarah-wilson': { name: 'Sarah Wilson', status: 'Last seen 2 hours ago', avatar: 'SW' }
};

const contactNames = {
  'me': 'You',
  'contact': 'Alice Johnson'
};

const initialMessagesByChat = {
  'alice-johnson': [
    {
      id: '1',
      text: 'Hey, are you ready for the secure file transfer?',
      timestamp: '10:30 AM',
      sender: 'contact' as const,
      status: 'read' as const,
      encrypted: true,
      sentAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    },
    {
      id: '2',
      text: 'Yes, all encryption protocols are active. Ready to receive.',
      timestamp: '10:32 AM',
      sender: 'me' as const,
      status: 'delivered' as const, // Changed to show unread status
      encrypted: true,
      sentAt: new Date(Date.now() - 28 * 60 * 1000) // 28 minutes ago
    },
    {
      id: '3',
      text: 'Perfect! The encrypted files have been sent securely through our protected channel.',
      timestamp: '10:35 AM',
      sender: 'contact' as const,
      status: 'read' as const,
      encrypted: true,
      sentAt: new Date(Date.now() - 25 * 60 * 1000)
    },
    {
      id: '4',
      text: 'Received and verified. All checksums match. Thanks for the secure transfer! 🔒',
      timestamp: '10:37 AM',
      sender: 'me' as const,
      status: 'delivered' as const,
      encrypted: true,
      sentAt: new Date(Date.now() - 7 * 60 * 1000) // 7 minutes ago - should trigger notification
    }
  ],
  'bob-smith': [
    {
      id: '1',
      text: 'Mission briefing at 1400 hours. Secure channel required.',
      timestamp: '9:15 AM',
      sender: 'contact' as const,
      status: 'read' as const,
      encrypted: true
    },
    {
      id: '2',
      text: 'Roger that, mission parameters confirmed. Encryption level set to maximum.',
      timestamp: '9:16 AM',
      sender: 'me' as const,
      status: 'read' as const,
      encrypted: true
    }
  ]
};

export const ChatArea = ({ activeChat, onStartCall }: ChatAreaProps) => {
  const [messagesByChat, setMessagesByChat] = useState(initialMessagesByChat);
  const [session, setSession] = useState<Session | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    unreadReminderEnabled: true,
    unreadReminderTime: 5
  });
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    messageText: string;
    sender: string;
  } | null>(null);

  const contact = contactInfo[activeChat as keyof typeof contactInfo];
  const currentMessages = messagesByChat[activeChat as keyof typeof messagesByChat] || [];
  
  useNotifications(currentMessages, notificationSettings);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
    });
  }, []);

  const handleReply = (messageId: string, messageText: string) => {
    const originalMessage = currentMessages.find(msg => msg.id === messageId);
    if (originalMessage) {
      setReplyingTo({
        messageId,
        messageText,
        sender: contactNames[originalMessage.sender]
      });
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = async (messageText: string, attachmentFile: File | null, encryptionMetadata?: any, replyTo?: any) => {
    if ((!messageText && !attachmentFile) || !session) return;
    
    console.log('Sending encrypted message:', messageText);

    let attachmentDetails: Message['attachment'] | undefined = undefined;

    if (attachmentFile) {
      const file = attachmentFile;
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/${activeChat}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, file);

      if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
          return;
      }
      
      const { data, error: signedUrlError } = await supabase.storage
          .from('chat_attachments')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days validity for the link

      if (signedUrlError) {
          console.error('Signed URL error:', signedUrlError);
          toast({ title: "Error creating link", description: signedUrlError.message, variant: "destructive" });
          return;
      }

      attachmentDetails = { 
        name: file.name, 
        url: data.signedUrl, 
        type: file.type,
        metadata: encryptionMetadata // Include encryption metadata
      };
    }
      
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'me' as const,
      status: 'sent' as const,
      encrypted: true,
      sentAt: new Date(),
      attachment: attachmentDetails,
      replyTo: replyTo,
    };

    setMessagesByChat(prev => ({
      ...prev,
      [activeChat]: [...(prev[activeChat as keyof typeof prev] || []), newMessage]
    }));
  };

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
