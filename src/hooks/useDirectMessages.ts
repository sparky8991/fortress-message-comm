
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/integrations/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { conversationService, DirectMessage, Conversation } from '@/services/conversationService';
import { toast } from '@/hooks/use-toast';
import { uploadChatAttachment } from '@/integrations/supabase/storage';

type MessageMetadata = Record<string, unknown> & {
  isVoiceMessage?: boolean;
  duration?: number;
  mimeType?: string;
};

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

  const sendMessageToConversation = async (
    conversationId: string,
    content: string,
    attachment?: File,
    metadata?: MessageMetadata,
    replyToId?: string
  ) => {
    const user = auth.currentUser;
    // Allow sending if there's content OR an attachment (for voice messages)
    if (!conversationId || (!content.trim() && !attachment)) return;
    if (!user) return;

    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentType: string | null = null;
      let messageType: 'text' | 'image' | 'file' | 'voice' = 'text';
      let messageMetadata = metadata;

      if (attachment) {
        const uploadedAttachment = await uploadChatAttachment({
          userId: user.uid,
          conversationId,
          file: attachment,
        });

        attachmentUrl = uploadedAttachment.publicUrl;
        attachmentName = attachment.name;
        attachmentType = attachment.type;
        messageMetadata = {
          ...(metadata || {}),
          storageProvider: 'supabase',
          storagePath: uploadedAttachment.path,
        };

        // Determine message type
        if (metadata?.isVoiceMessage) {
          messageType = 'voice';
        } else if (attachment.type.startsWith('image/')) {
          messageType = 'image';
        } else {
          messageType = 'file';
        }
      }

      const newMessage = await conversationService.sendMessage(
        conversationId,
        content,
        messageType,
        attachmentUrl,
        attachmentName,
        attachmentType,
        replyToId,
        messageMetadata
      );

      await loadConversations();
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: 'Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  // Send a message to the currently selected conversation
  const sendMessage = async (
    content: string,
    attachment?: File,
    metadata?: MessageMetadata,
    replyToId?: string
  ) => {
    if (!activeConversation) return;
    return sendMessageToConversation(activeConversation, content, attachment, metadata, replyToId);
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
          reply_to_id: data.reply_to_id || null,
          metadata: data.metadata || null
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
    let unsubscribeParticipants: (() => void) | null = null;
    let unsubscribeConversations: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (unsubscribeParticipants) {
        unsubscribeParticipants();
        unsubscribeParticipants = null;
      }
      if (unsubscribeConversations) {
        unsubscribeConversations();
        unsubscribeConversations = null;
      }

      if (user) {
        loadConversations();

        const participantsQuery = query(
          collection(db, 'conversation_participants'),
          where('user_id', '==', user.uid)
        );

        unsubscribeParticipants = onSnapshot(participantsQuery, () => {
          loadConversations();
        }, (error) => {
          console.error('Error in conversation participants subscription:', error);
        });

        unsubscribeConversations = onSnapshot(collection(db, 'conversations'), () => {
          loadConversations();
        }, (error) => {
          console.error('Error in conversations subscription:', error);
        });
      }
    });
    return () => {
      unsubscribe();
      if (unsubscribeParticipants) unsubscribeParticipants();
      if (unsubscribeConversations) unsubscribeConversations();
    };
  }, []);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    sendMessage,
    sendMessageToConversation,
    switchToConversation,
    loadConversations,
    getTotalUnreadCount
  };
};
