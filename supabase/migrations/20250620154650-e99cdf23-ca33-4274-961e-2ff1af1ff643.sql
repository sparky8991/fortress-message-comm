
-- Create conversations table for direct chats
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT
);

-- Create conversation participants table
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

-- Create direct messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  read_at TIMESTAMP WITH TIME ZONE,
  encrypted BOOLEAN NOT NULL DEFAULT true,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  reply_to_id UUID REFERENCES public.direct_messages(id)
);

-- Create conversation notifications table
CREATE TABLE public.conversation_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_chat', 'new_message', 'mention')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_preview TEXT
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update conversations they participate in"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

CREATE POLICY "Users can insert participants when creating conversations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- RLS Policies for direct_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = direct_messages.conversation_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = direct_messages.conversation_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.direct_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- RLS Policies for conversation_notifications
CREATE POLICY "Users can view their own notifications"
  ON public.conversation_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.conversation_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.conversation_notifications FOR INSERT
  WITH CHECK (true);

-- Create function to find or create direct conversation
CREATE OR REPLACE FUNCTION public.find_or_create_direct_conversation(
  other_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  conversation_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if conversation already exists
  SELECT c.id INTO conversation_id
  FROM public.conversations c
  WHERE c.type = 'direct'
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp1
    WHERE cp1.conversation_id = c.id
    AND cp1.user_id = current_user_id
    AND cp1.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = c.id
    AND cp2.user_id = other_user_id
    AND cp2.is_active = true
  )
  AND (
    SELECT COUNT(*) FROM public.conversation_participants cp
    WHERE cp.conversation_id = c.id
    AND cp.is_active = true
  ) = 2;
  
  -- If conversation doesn't exist, create it
  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (type)
    VALUES ('direct')
    RETURNING id INTO conversation_id;
    
    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
      (conversation_id, current_user_id),
      (conversation_id, other_user_id);
      
    -- Create notification for the other user
    INSERT INTO public.conversation_notifications (user_id, conversation_id, type, message_preview)
    VALUES (other_user_id, conversation_id, 'new_chat', 'Started a new conversation with you');
  END IF;
  
  RETURN conversation_id;
END;
$$;

-- Create function to search users
CREATE OR REPLACE FUNCTION public.search_users(
  search_term TEXT
) RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  user_number INTEGER,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.user_number,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id != auth.uid()
  AND (
    LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR
    LOWER(p.full_name) LIKE LOWER('%' || search_term || '%') OR
    p.user_number::TEXT LIKE '%' || search_term || '%'
  )
  ORDER BY p.username
  LIMIT 20;
END;
$$;

-- Enable realtime for direct messages
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_notifications;
