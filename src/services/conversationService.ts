
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
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  read_at: string | null;
  encrypted: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  reply_to_id: string | null;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  participants?: {
    user_id: string;
    joined_at: string;
    role: string;
    is_active: boolean;
    profiles?: {
      username: string;
      full_name: string;
      user_number: number;
      avatar_url: string;
    };
  }[];
}

// Helper to convert Firestore timestamp to ISO string
const toISOString = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  return new Date(timestamp).toISOString();
};

export const conversationService = {
  async getConversations(): Promise<Conversation[]> {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      // Get conversations where current user is a participant
      const participantsRef = collection(db, 'conversation_participants');
      const participantsQuery = query(
        participantsRef,
        where('user_id', '==', user.uid),
        where('is_active', '==', true)
      );
      const participantsSnap = await getDocs(participantsQuery);

      const conversationIds = participantsSnap.docs.map(doc => doc.data().conversation_id);

      if (conversationIds.length === 0) return [];

      // Get all conversations
      const conversations: Conversation[] = [];
      for (const convId of conversationIds) {
        const convRef = doc(db, 'conversations', convId);
        const convSnap = await getDoc(convRef);

        if (convSnap.exists()) {
          const data = convSnap.data();
          conversations.push({
            id: convSnap.id,
            type: data.type || 'direct',
            created_at: toISOString(data.created_at),
            updated_at: toISOString(data.updated_at),
            last_message_at: data.last_message_at ? toISOString(data.last_message_at) : null,
            last_message_preview: data.last_message_preview || null,
            participants: []
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
      const messagesQuery = query(
        messagesRef,
        where('conversation_id', '==', conversationId),
        orderBy('sent_at', 'asc')
      );
      const messagesSnap = await getDocs(messagesQuery);

      return messagesSnap.docs.map(doc => {
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
          reply_to_id: data.reply_to_id || null
        };
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  },

  async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    attachmentUrl?: string,
    attachmentName?: string,
    attachmentType?: string,
    replyToId?: string
  ): Promise<DirectMessage> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
      const messagesRef = collection(db, 'direct_messages');
      const newMessage = {
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

      const docRef = await addDoc(messagesRef, newMessage);

      // Update conversation's last message info
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        last_message_at: serverTimestamp(),
        last_message_preview: content.substring(0, 100),
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
        reply_to_id: replyToId || null
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
      const participantsRef = collection(db, 'conversation_participants');
      const participantsQuery = query(
        participantsRef,
        where('conversation_id', '==', conversationId),
        where('is_active', '==', true)
      );
      const participantsSnap = await getDocs(participantsQuery);

      const participants = [];
      for (const participantDoc of participantsSnap.docs) {
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
            avatar_url: profileData.avatarUrl || null
          } : null
        });
      }

      return participants;
    } catch (error) {
      console.error('Error getting participants:', error);
      throw error;
    }
  },

  async findOrCreateDirectConversation(otherUserId: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    try {
      // Check for existing conversation
      const participantsRef = collection(db, 'conversation_participants');
      const myParticipationsQuery = query(
        participantsRef,
        where('user_id', '==', user.uid),
        where('is_active', '==', true)
      );
      const myParticipations = await getDocs(myParticipationsQuery);

      for (const participation of myParticipations.docs) {
        const convId = participation.data().conversation_id;

        // Check if the other user is also in this conversation
        const otherQuery = query(
          participantsRef,
          where('conversation_id', '==', convId),
          where('user_id', '==', otherUserId),
          where('is_active', '==', true)
        );
        const otherSnap = await getDocs(otherQuery);

        if (!otherSnap.empty) {
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
