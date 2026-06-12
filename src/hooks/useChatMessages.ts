
import { useState, useEffect } from 'react';
import { auth } from '@/integrations/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { Message, initialMessagesByChat } from '@/constants/initialMessages';
import { contactNames } from '@/constants/contactInfo';
import { uploadChatAttachment } from '@/integrations/supabase/storage';

type MessageMetadata = Record<string, unknown> & {
  isVoiceMessage?: boolean;
  duration?: number;
  mimeType?: string;
};

export const useChatMessages = (activeChat: string) => {
  const [messagesByChat, setMessagesByChat] = useState(initialMessagesByChat);
  const [user, setUser] = useState<User | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    messageText: string;
    sender: string;
  } | null>(null);

  const currentMessages = messagesByChat[activeChat as keyof typeof messagesByChat] || [];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleStartNewGroup = (contactName: string) => {
    toast({
      title: "Starting New Group",
      description: `Creating a new group with ${contactName}...`,
    });
    console.log(`Starting new group with ${contactName}`);
  };

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

  const handleSendMessage = async (
    messageText: string,
    attachmentFile: File | null,
    encryptionMetadata?: MessageMetadata,
    replyTo?: Message['replyTo']
  ) => {
    if ((!messageText && !attachmentFile) || !user) return;

    console.log('Sending encrypted message:', messageText);

    let attachmentDetails: Message['attachment'] | undefined = undefined;

    if (attachmentFile) {
      const file = attachmentFile;

      try {
        const uploadedAttachment = await uploadChatAttachment({
          userId: user.uid,
          conversationId: activeChat,
          file,
        });

        attachmentDetails = {
          name: file.name,
          url: uploadedAttachment.publicUrl,
          type: file.type,
          metadata: {
            ...(encryptionMetadata || {}),
            storageProvider: 'supabase',
            storagePath: uploadedAttachment.path,
          }
        };
      } catch (error: unknown) {
        const description = error instanceof Error ? error.message : 'Unable to upload attachment.';
        console.error('Upload error:', error);
        toast({ title: "Upload Failed", description, variant: "destructive" });
        return;
      }
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

  return {
    currentMessages,
    replyingTo,
    handleStartNewGroup,
    handleReply,
    handleCancelReply,
    handleSendMessage
  };
};
