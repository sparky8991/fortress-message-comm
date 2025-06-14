import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, MoreVertical, Shield, Lock, Send, Paperclip, Smile, Settings, FileText, X } from 'lucide-react';
import { MessageList } from './MessageList';
import { EmojiPicker } from './EmojiPicker';
import { NotificationSettings } from './NotificationSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

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
  const [message, setMessage] = useState('');
  const [messagesByChat, setMessagesByChat] = useState(initialMessagesByChat);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    unreadReminderEnabled: true,
    unreadReminderTime: 5
  });

  const contact = contactInfo[activeChat as keyof typeof contactInfo];
  const currentMessages = messagesByChat[activeChat as keyof typeof messagesByChat] || [];
  
  useNotifications(currentMessages, notificationSettings);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
    });
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const BANNED_EXTENSIONS = ['exe', 'msi', 'bat', 'cmd', 'sh', 'js', 'jsx', 'ts', 'tsx', 'ps1', 'vbs', 'html', 'css', 'php'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && BANNED_EXTENSIONS.includes(fileExtension)) {
      toast({ title: 'File type not allowed', description: 'For security reasons, script files cannot be attached.', variant: 'destructive'});
      return;
    }

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File is too large', description: 'Please select a file smaller than 25MB.', variant: 'destructive'});
      return;
    }
    
    setAttachment(file);
    event.target.value = ''; // Reset file input
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && !attachment) || !session) return;
    
    console.log('Sending encrypted message:', message);

    let attachmentDetails: Message['attachment'] | undefined = undefined;

    if (attachment) {
      const file = attachment;
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/${activeChat}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, file);

      if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
          setAttachment(null);
          return;
      }
      
      const { data, error: signedUrlError } = await supabase.storage
          .from('chat_attachments')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days validity for the link

      if (signedUrlError) {
          console.error('Signed URL error:', signedUrlError);
          toast({ title: "Error creating link", description: signedUrlError.message, variant: "destructive" });
          setAttachment(null);
          return;
      }

      attachmentDetails = { name: file.name, url: data.signedUrl, type: file.type };
    }
      
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'me' as const,
      status: 'sent' as const,
      encrypted: true,
      sentAt: new Date(),
      attachment: attachmentDetails,
    };

    setMessagesByChat(prev => ({
      ...prev,
      [activeChat]: [...(prev[activeChat as keyof typeof prev] || []), newMessage]
    }));

    setMessage('');
    setAttachment(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
              {contact?.avatar}
            </div>
            <div>
              <h2 className="font-semibold text-white">{contact?.name}</h2>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-300">{contact?.status}</p>
                <div className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">End-to-end encrypted</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onStartCall('voice')}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={() => onStartCall('video')}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Video className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowNotificationSettings(true)}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Notification Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={currentMessages} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        {attachment && (
          <div className="mb-2 px-2 py-1 bg-gray-700/80 rounded-lg flex items-center justify-between animate-in fade-in-50">
            <div className="flex items-center space-x-2 overflow-hidden">
              <FileText className="w-5 h-5 text-gray-300 flex-shrink-0" />
              <span className="text-sm text-white truncate">{attachment.name}</span>
            </div>
            <button onClick={() => setAttachment(null)} className="p-1 text-gray-300 hover:text-white rounded-full hover:bg-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type an encrypted message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 relative">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-gray-300 hover:text-white transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            className="p-3 bg-green-500 hover:bg-green-600 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!message.trim() && !attachment}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center space-x-1 text-xs text-green-500">
            <Shield className="w-3 h-3" />
            <span>Messages are secured with military-grade encryption</span>
          </div>
        </div>
      </div>

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </div>
  );
};
