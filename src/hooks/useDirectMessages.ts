
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/integrations/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { conversationService, DirectMessage, Conversation } from '@/services/conversationService';
import { toast } from '@/hooks/use-toast';

export const useDirectMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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
      await loadConversations();
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
  const switchToConversation = async (conversationId: string) => {
    setActiveConversation(conversationId);
    loadMessages(conversationId);

    // Mark conversation as read
    await conversationService.markConversationAsRead(conversationId);

    // Update local conversations to reflect read status
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
    ));
  };

  // Get total unread count across all conversations
  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
  };

  // Set up real-time subscriptions for messages
  useEffect(() => {
    if (!activeConversation) return;

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to messages for the active conversation
    // Only use where clause to avoid needing composite index
    const messagesRef = collection(db, 'direct_messages');
    const messagesQuery = query(
      messagesRef,
      where('conversation_id', '==', activeConversation)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: DirectMessage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          content: data.content,
          sent_at: data.sent_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          message_type: data.message_type || 'text',
          read_at: data.read_at?.toDate?.()?.toISOString() || null,
          encrypted: data.encrypted || false,
          attachment_url: data.attachment_url || null,
          attachment_name: data.attachment_name || null,
          attachment_type: data.attachment_type || null,
          reply_to_id: data.reply_to_id || null
        };
      });
      // Sort client-side by sent_at ascending
      newMessages.sort((a, b) =>
        new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      );
      setMessages(newMessages);
    }, (error) => {
      console.error('Error in messages subscription:', error);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [activeConversation]);

  // Load conversations on mount (only if authenticated)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadConversations();
      }
    });
    return () => unsubscribe();
  }, []);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    sendMessage,
    switchToConversation,
    loadConversations,
    getTotalUnreadCount
  };
};
