
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { conversationService, DirectMessage, Conversation } from '@/services/conversationService';
import { toast } from '@/hooks/use-toast';

export const useDirectMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Load conversations
  const loadConversations = async () => {
    try {
      const data = await conversationService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Failed to load conversations',
        description: 'Please try refreshing the page.',
        variant: 'destructive'
      });
    }
  };

  // Load messages for active conversation
  const loadMessages = async (conversationId: string) => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const data = await conversationService.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Failed to load messages',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Send a message
  const sendMessage = async (
    content: string,
    attachment?: File,
    replyToId?: string
  ) => {
    if (!activeConversation || !content.trim()) return;

    try {
      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentType = null;
      let messageType: 'text' | 'image' | 'file' = 'text';

      if (attachment) {
        // For now, we'll handle attachments as file messages
        // In a full implementation, you'd upload to Supabase Storage
        attachmentName = attachment.name;
        attachmentType = attachment.type;
        messageType = attachment.type.startsWith('image/') ? 'image' : 'file';
      }

      const newMessage = await conversationService.sendMessage(
        activeConversation,
        content,
        messageType,
        attachmentUrl,
        attachmentName,
        attachmentType,
        replyToId
      );

      setMessages(prev => [...prev, newMessage]);
      await loadConversations(); // Refresh to update last message info
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Switch to a conversation
  const switchToConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    loadMessages(conversationId);
  };

  // Set up real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('direct-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages'
        },
        (payload) => {
          const newMessage = payload.new as DirectMessage;
          
          // Only add message if it's for the active conversation
          if (newMessage.conversation_id === activeConversation) {
            setMessages(prev => [...prev, newMessage]);
          }
          
          // Refresh conversations to update last message info
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_notifications'
        },
        (payload) => {
          const notification = payload.new as any;
          if (notification.type === 'new_chat') {
            toast({
              title: '🔒 NEW SECURE CHANNEL',
              description: 'Someone started a conversation with you.',
            });
            loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    sendMessage,
    switchToConversation,
    loadConversations
  };
};
