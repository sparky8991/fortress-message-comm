
import { db, auth } from '@/integrations/firebase/client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

type TimestampLike = Date | string | number | Timestamp | { toDate: () => Date } | null;

export type DirectMessageMetadata = Record<string, unknown> & {
  isVoiceMessage?: boolean;
  duration?: number;
  mimeType?: string;
  burnAfterRead?: boolean;
  burnAfterReadSeconds?: number;
  burnOpenedAt?: TimestampLike;
  burnExpiresAt?: TimestampLike;
  burnOpenedBy?: string | null;
};

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  message_type: 'text' | 'image' | 'file' | 'voice' | 'system';
  read_at: string | null;
  encrypted: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  reply_to_id: string | null;
  metadata?: DirectMessageMetadata | null;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count?: number;
  participants?: {
    user_id: string;
    joined_at: string;
    role: string;
    is_active: boolean;
    profiles?: {
      username: string;
      full_name: string;
      user_number: number;
      avatar_url: string | null;
      show_avatar?: boolean;
    };
  }[];
}

// Helper to convert Firestore timestamp to ISO string
const toISOString = (timestamp: TimestampLike): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) return timestamp.toISOString();
  return new Date(timestamp).toISOString();
};

export const conversationService = {
  async getConversations(): Promise<Conversation[]> {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      // Get conversations where current user is a participant
      // Use single where clause to avoid needing composite index
      const participantsRef = collection(db, 'conversation_participants');
      const participantsQuery = query(
        participantsRef,
        where('user_id', '==', user.uid)
      );
      const participantsSnap = await getDocs(participantsQuery);

      // Filter for active participants client-side
      const activeParticipations = participantsSnap.docs.filter(doc =>
        doc.data().is_active === true
      );

      const conversationIds = activeParticipations.map(doc => doc.data().conversation_id);

      if (conversationIds.length === 0) return [];

      // Get all conversations
      const conversations: Conversation[] = [];
      for (const convId of conversationIds) {
        const convRef = doc(db, 'conversations', convId);
        const convSnap = await getDoc(convRef);

        if (convSnap.exists()) {
          const data = convSnap.data();

          // Get participants for this conversation
          const participants = await this.getConversationParticipants(convId);

          // Get unread count
          const unread_count = await this.getUnreadCount(convId);

          conversations.push({
            id: convSnap.id,
            type: data.type || 'direct',
            created_at: toISOString(data.created_at),
            updated_at: toISOString(data.updated_at),
            last_message_at: data.last_message_at ? toISOString(data.last_message_at) : null,
            last_message_preview: data.last_message_preview || null,
            unread_count,
            participants: participants
          });
        }
      }

      // Sort by last_message_at
      return conversations.sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  },

  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    try {
      const messagesRef = collection(db, 'direct_messages');
      // Only use where clause to avoid needing composite index
      const messagesQuery = query(
        messagesRef,
        where('conversation_id', '==', conversationId)
      );
      const messagesSnap = await getDocs(messagesQuery);

      const messages = messagesSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          content: data.content,
          sent_at: toISOString(data.sent_at),
          message_type: data.message_type || 'text',
          read_at: data.read_at ? toISOString(data.read_at) : null,
          encrypted: data.encrypted || false,
          attachment_url: data.attachment_url || null,
          attachment_name: data.attachment_name || null,
          attachment_type: data.attachment_type || null,
          reply_to_id: data.reply_to_id || null,
          metadata: data.metadata || null
        };
      });

      // Sort client-side by sent_at ascending
      return messages.sort((a, b) =>
        new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      );
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  },

  async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'voice' = 'text',
    attachmentUrl?: string | null,
    attachmentName?: string | null,
    attachmentType?: string | null,
    replyToId?: string,
    metadata?: DirectMessageMetadata
  ): Promise<DirectMessage> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
      const messagesRef = collection(db, 'direct_messages');
      const newMessage: Record<string, unknown> = {
        conversation_id: conversationId,
        sender_id: user.uid,
        content,
        message_type: messageType,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        attachment_type: attachmentType || null,
        reply_to_id: replyToId || null,
        encrypted: true,
        sent_at: serverTimestamp(),
        read_at: null
      };

      // Add metadata for voice messages
      if (metadata) {
        newMessage.metadata = metadata;
      }

      const docRef = await addDoc(messagesRef, newMessage);

      // Update conversation's last message info
      const convRef = doc(db, 'conversations', conversationId);

      // Generate appropriate preview for message type
      let lastMessagePreview = content.substring(0, 100);
      if (messageType === 'voice') {
        const duration = metadata?.duration || 0;
        lastMessagePreview = `🎙️ Voice message (${duration}s)`;
      } else if (messageType === 'image' && !content) {
        lastMessagePreview = '📷 Image';
      } else if (messageType === 'file' && !content) {
        lastMessagePreview = `📎 ${attachmentName || 'File'}`;
      }

      await updateDoc(convRef, {
        last_message_at: serverTimestamp(),
        last_message_preview: lastMessagePreview,
        updated_at: serverTimestamp()
      });

      return {
        id: docRef.id,
        conversation_id: conversationId,
        sender_id: user.uid,
        content,
        sent_at: new Date().toISOString(),
        message_type: messageType,
        read_at: null,
        encrypted: true,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        attachment_type: attachmentType || null,
        reply_to_id: replyToId || null,
        metadata: metadata || null
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, 'direct_messages', messageId);
      await updateDoc(messageRef, {
        read_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  },

  async getConversationParticipants(conversationId: string) {
    try {
      // Use single where clause to avoid composite index
      const participantsRef = collection(db, 'conversation_participants');
      const participantsQuery = query(
        participantsRef,
        where('conversation_id', '==', conversationId)
      );
      const participantsSnap = await getDocs(participantsQuery);

      // Filter for active participants client-side
      const activeParticipantDocs = participantsSnap.docs.filter(doc =>
        doc.data().is_active === true
      );

      const participants = [];
      for (const participantDoc of activeParticipantDocs) {
        const data = participantDoc.data();

        // Get profile data
        const profileRef = doc(db, 'profiles', data.user_id);
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists() ? profileSnap.data() : null;

        participants.push({
          user_id: data.user_id,
          joined_at: toISOString(data.joined_at),
          role: data.role || 'member',
          is_active: data.is_active,
          profiles: profileData ? {
            username: profileData.callSign || profileData.email,
            full_name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
            user_number: 0,
            avatar_url: profileData.showAvatar !== false ? (profileData.avatarUrl || null) : null,
            show_avatar: profileData.showAvatar !== false
          } : null
        });
      }

      return participants;
    } catch (error) {
      console.error('Error getting participants:', error);
      throw error;
    }
  },

  async getUnreadCount(conversationId: string): Promise<number> {
    const user = auth.currentUser;
    if (!user) return 0;

    try {
      const messagesRef = collection(db, 'direct_messages');
      const messagesQuery = query(
        messagesRef,
        where('conversation_id', '==', conversationId)
      );
      const messagesSnap = await getDocs(messagesQuery);

      // Count messages not from current user that are unread (read_at is null)
      let unreadCount = 0;
      messagesSnap.forEach(doc => {
        const data = doc.data();
        if (data.sender_id !== user.uid && !data.read_at) {
          unreadCount++;
        }
      });

      return unreadCount;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  async markConversationAsRead(conversationId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const messagesRef = collection(db, 'direct_messages');
      const messagesQuery = query(
        messagesRef,
        where('conversation_id', '==', conversationId)
      );
      const messagesSnap = await getDocs(messagesQuery);

      // Mark all unread messages from other users as read
      const batch: Promise<void>[] = [];
      messagesSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.sender_id !== user.uid && !data.read_at) {
          const messageRef = doc(db, 'direct_messages', docSnap.id);
          batch.push(updateDoc(messageRef, { read_at: serverTimestamp() }));
        }
      });

      await Promise.all(batch);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  },

  async findOrCreateDirectConversation(otherUserId: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
      // Check for existing conversation
      // Use single where clause to avoid composite index
      const participantsRef = collection(db, 'conversation_participants');
      const myParticipationsQuery = query(
        participantsRef,
        where('user_id', '==', user.uid)
      );
      const myParticipations = await getDocs(myParticipationsQuery);

      // Filter for active participations client-side
      const activeParticipations = myParticipations.docs.filter(doc =>
        doc.data().is_active === true
      );

      for (const participation of activeParticipations) {
        const convId = participation.data().conversation_id;

        // Check if the other user is also in this conversation
        // Use single where clause to avoid composite index
        const otherQuery = query(
          participantsRef,
          where('conversation_id', '==', convId)
        );
        const otherSnap = await getDocs(otherQuery);

        // Filter client-side for the other user who is active
        const otherUserInConv = otherSnap.docs.find(doc => {
          const data = doc.data();
          return data.user_id === otherUserId && data.is_active === true;
        });

        if (otherUserInConv) {
          // Check if it's a direct conversation
          const convRef = doc(db, 'conversations', convId);
          const convSnap = await getDoc(convRef);
          if (convSnap.exists() && convSnap.data().type === 'direct') {
            return convId;
          }
        }
      }

      // Create new conversation
      const conversationsRef = collection(db, 'conversations');
      const newConv = await addDoc(conversationsRef, {
        type: 'direct',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        last_message_at: null,
        last_message_preview: null
      });

      // Add participants
      await addDoc(participantsRef, {
        conversation_id: newConv.id,
        user_id: user.uid,
        joined_at: serverTimestamp(),
        role: 'member',
        is_active: true
      });

      await addDoc(participantsRef, {
        conversation_id: newConv.id,
        user_id: otherUserId,
        joined_at: serverTimestamp(),
        role: 'member',
        is_active: true
      });

      return newConv.id;
    } catch (error) {
      console.error('Error finding/creating conversation:', error);
      throw error;
    }
  }
};
