
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';
import { Message, initialMessagesByChat } from '@/constants/initialMessages';
import { contactNames } from '@/constants/contactInfo';

export const useChatMessages = (activeChat: string) => {
  const [messagesByChat, setMessagesByChat] = useState(initialMessagesByChat);
  const [session, setSession] = useState<Session | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    messageText: string;
    sender: string;
  } | null>(null);

  const currentMessages = messagesByChat[activeChat as keyof typeof messagesByChat] || [];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
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

  return {
    currentMessages,
    replyingTo,
    handleStartNewGroup,
    handleReply,
    handleCancelReply,
    handleSendMessage
  };
};
