-- =====================================================
-- FORTRESS MESSAGE COMM - COMPLETE DATABASE SETUP
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, call_sign)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'call_sign'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- 2. TEAM ROLE ENUM
-- =====================================================
CREATE TYPE public.team_role AS ENUM ('diamond_in_the_rough', 'team_lead', 'team_organizer', 'team_user');

-- =====================================================
-- 3. TEAMS TABLE
-- =====================================================
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create teams."
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team members can view their team's details."
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. TEAM MEMBERS TABLE
-- =====================================================
CREATE TABLE public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role public.team_role NOT NULL DEFAULT 'team_user',
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team leads and diamonds can add members to their team."
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('diamond_in_the_rough', 'team_lead')
    )
  );

CREATE POLICY "Users can see members of teams they belong to."
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members AS tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave their teams."
  ON public.team_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team leads and diamonds can update member roles."
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('diamond_in_the_rough', 'team_lead')
    )
  );

-- Auto-add creator to team as diamond_in_the_rough
CREATE OR REPLACE FUNCTION public.add_creator_to_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'diamond_in_the_rough');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE PROCEDURE public.add_creator_to_team();

-- =====================================================
-- 5. TEAM INVITATIONS TABLE
-- =====================================================
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  invitation_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role team_role NOT NULL DEFAULT 'team_user',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_contact_method CHECK (
    (email IS NOT NULL AND phone_number IS NULL) OR
    (email IS NULL AND phone_number IS NOT NULL)
  )
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team invitations"
  ON public.team_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invitations.team_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team leads can create invitations"
  ON public.team_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invitations.team_id
      AND user_id = auth.uid()
      AND role IN ('diamond_in_the_rough', 'team_lead')
    )
  );

CREATE POLICY "Team leads can update invitations"
  ON public.team_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invitations.team_id
      AND user_id = auth.uid()
      AND role IN ('diamond_in_the_rough', 'team_lead')
    )
  );

-- Function to accept invitation and join team
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invitation_record public.team_invitations%ROWTYPE;
  user_id UUID;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  SELECT * INTO invitation_record
  FROM public.team_invitations
  WHERE invitation_code = accept_team_invitation.invitation_code
  AND status = 'pending'
  AND expires_at > now();

  IF invitation_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = invitation_record.team_id
    AND user_id = user_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'User is already a team member');
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (invitation_record.team_id, user_id, invitation_record.role);

  UPDATE public.team_invitations
  SET status = 'accepted'
  WHERE id = invitation_record.id;

  RETURN json_build_object('success', true, 'message', 'Successfully joined team');
END;
$$;

-- =====================================================
-- 6. PROFILE EXTENSIONS
-- =====================================================
CREATE SEQUENCE public.user_number_seq
  START WITH 10011
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER TABLE public.profiles
ADD COLUMN user_number INTEGER NOT NULL UNIQUE DEFAULT nextval('public.user_number_seq'),
ADD COLUMN bio TEXT,
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN call_sign text UNIQUE,
ADD COLUMN ghost_mode_active BOOLEAN DEFAULT false,
ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD CONSTRAINT bio_length_check CHECK (char_length(bio) <= 500);

-- =====================================================
-- 7. CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- 8. CONVERSATION PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- 9. DIRECT MESSAGES TABLE
-- =====================================================
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

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- 10. CONVERSATION NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE public.conversation_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_chat', 'new_message', 'mention')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_preview TEXT
);

ALTER TABLE public.conversation_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.conversation_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.conversation_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.conversation_notifications FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 11. CONVERSATION FUNCTIONS
-- =====================================================
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

  IF conversation_id IS NULL THEN
    INSERT INTO public.conversations (type)
    VALUES ('direct')
    RETURNING id INTO conversation_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES
      (conversation_id, current_user_id),
      (conversation_id, other_user_id);

    INSERT INTO public.conversation_notifications (user_id, conversation_id, type, message_preview)
    VALUES (other_user_id, conversation_id, 'new_chat', 'Started a new conversation with you');
  END IF;

  RETURN conversation_id;
END;
$$;

-- Search users function
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

-- =====================================================
-- 12. GHOST SESSIONS TABLE
-- =====================================================
CREATE TABLE public.ghost_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users NOT NULL,
  team_id UUID REFERENCES public.teams NOT NULL,
  session_name TEXT NOT NULL,
  encryption_key TEXT NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.ghost_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ghost sessions they created or are members of"
  ON public.ghost_sessions
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.ghost_session_members
      WHERE session_id = ghost_sessions.id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Team members can create ghost sessions"
  ON public.ghost_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = ghost_sessions.team_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Session creators can update their sessions"
  ON public.ghost_sessions
  FOR UPDATE
  USING (created_by = auth.uid());

-- =====================================================
-- 13. GHOST SESSION MEMBERS TABLE
-- =====================================================
CREATE TABLE public.ghost_session_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ghost_sessions ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.ghost_session_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session members can view membership"
  ON public.ghost_session_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.ghost_sessions
      WHERE id = ghost_session_members.session_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Session creators can manage members"
  ON public.ghost_session_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ghost_sessions
      WHERE id = ghost_session_members.session_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can join sessions they're invited to"
  ON public.ghost_session_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 14. GHOST MESSAGES TABLE
-- =====================================================
CREATE TABLE public.ghost_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ghost_sessions ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users NOT NULL,
  encrypted_content TEXT NOT NULL,
  message_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ghost_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session members can view messages"
  ON public.ghost_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ghost_session_members
      WHERE session_id = ghost_messages.session_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Session members can send messages"
  ON public.ghost_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.ghost_session_members
      WHERE session_id = ghost_messages.session_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- =====================================================
-- 15. GHOST SESSION FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_ghost_session(
  p_team_id UUID,
  p_session_name TEXT,
  p_encryption_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  INSERT INTO public.ghost_sessions (created_by, team_id, session_name, encryption_key)
  VALUES (auth.uid(), p_team_id, p_session_name, p_encryption_key)
  RETURNING id INTO session_id;

  INSERT INTO public.ghost_session_members (session_id, user_id)
  VALUES (session_id, auth.uid());

  RETURN session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_ghost_session(
  p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_members INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT
    COUNT(gsm.user_id),
    gs.max_members
  INTO current_members, max_allowed
  FROM public.ghost_sessions gs
  LEFT JOIN public.ghost_session_members gsm ON gs.id = gsm.session_id AND gsm.is_active = true
  WHERE gs.id = p_session_id AND gs.is_active = true
  GROUP BY gs.max_members;

  IF max_allowed IS NULL THEN
    RAISE EXCEPTION 'Ghost session not found or inactive';
  END IF;

  IF current_members >= max_allowed THEN
    RAISE EXCEPTION 'Ghost session is full (max % members)', max_allowed;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ghost_session_members
    WHERE session_id = p_session_id AND user_id = auth.uid()
  ) THEN
    UPDATE public.ghost_session_members
    SET is_active = true, joined_at = now()
    WHERE session_id = p_session_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.ghost_session_members (session_id, user_id)
    VALUES (p_session_id, auth.uid());
  END IF;

  RETURN true;
END;
$$;

-- =====================================================
-- 16. USER SETTINGS TABLE
-- =====================================================
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_settings JSONB DEFAULT '{
    "unreadReminderEnabled": true,
    "reminderTimerEnabled": true,
    "unreadReminderTime": 5
  }'::jsonb,
  security_settings JSONB DEFAULT '{
    "autoDeleteMessages": true,
    "screenshotProtection": true,
    "biometricLock": true,
    "autoDeleteTimer": 24
  }'::jsonb,
  appearance_settings JSONB DEFAULT '{
    "theme": "dark",
    "fontSize": "medium",
    "language": "en"
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-create settings for new users
CREATE OR REPLACE FUNCTION public.create_default_user_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_user_settings();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_settings_updated_at();

-- =====================================================
-- 17. STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat_attachments', 'chat_attachments', false, 26214400, NULL)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 26214400;

-- Storage policies
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat_attachments');

CREATE POLICY "Users can update their own attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);

-- =====================================================
-- 18. ENABLE REALTIME
-- =====================================================
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_notifications;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
