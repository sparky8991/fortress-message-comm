
import { supabase } from '@/integrations/supabase/client';

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

export const conversationService = {
  async getConversations(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner (
          user_id,
          joined_at,
          role,
          is_active
        )
      `)
      .eq('conversation_participants.is_active', true)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data || []).map(conv => ({
      ...conv,
      type: conv.type as 'direct' | 'group',
      participants: conv.conversation_participants?.map((p: any) => ({
        user_id: p.user_id,
        joined_at: p.joined_at,
        role: p.role,
        is_active: p.is_active
      })) || []
    }));
  },

  async getMessages(conversationId: string): Promise<DirectMessage[]> {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(msg => ({
      ...msg,
      message_type: msg.message_type as 'text' | 'image' | 'file' | 'system'
    }));
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
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        content,
        message_type: messageType,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        attachment_type: attachmentType || null,
        reply_to_id: replyToId || null,
        encrypted: true
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation's last message info
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return {
      ...data,
      message_type: data.message_type as 'text' | 'image' | 'file' | 'system'
    };
  },

  async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) throw error;
  },

  async getConversationParticipants(conversationId: string) {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        *,
        profiles (
          username,
          full_name,
          user_number,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }
};
