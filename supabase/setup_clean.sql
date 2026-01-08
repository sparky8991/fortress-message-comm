-- FORTRESS MESSAGE COMM DATABASE SETUP

-- Drop existing objects
DROP TABLE IF EXISTS public.ghost_messages CASCADE;
DROP TABLE IF EXISTS public.ghost_session_members CASCADE;
DROP TABLE IF EXISTS public.ghost_sessions CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.conversation_notifications CASCADE;
DROP TABLE IF EXISTS public.direct_messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.team_invitations CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.team_role CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.add_creator_to_team() CASCADE;
DROP FUNCTION IF EXISTS public.accept_team_invitation(text) CASCADE;
DROP FUNCTION IF EXISTS public.find_or_create_direct_conversation(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.search_users(text) CASCADE;
DROP FUNCTION IF EXISTS public.create_ghost_session(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.join_ghost_session(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_default_user_settings() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_settings_updated_at() CASCADE;
DROP SEQUENCE IF EXISTS public.user_number_seq CASCADE;

-- Create types and sequences
CREATE TYPE public.team_role AS ENUM ('diamond_in_the_rough', 'team_lead', 'team_organizer', 'team_user');
CREATE SEQUENCE public.user_number_seq START WITH 10011;

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  user_number INTEGER DEFAULT nextval('public.user_number_seq'),
  bio TEXT,
  first_name text,
  last_name text,
  call_sign text UNIQUE,
  ghost_mode_active BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT bio_length_check CHECK (char_length(bio) <= 500)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create team_members table
CREATE TABLE public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role public.team_role NOT NULL DEFAULT 'team_user',
  PRIMARY KEY (team_id, user_id)
);

-- Create team_invitations table
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
  CONSTRAINT check_contact_method CHECK ((email IS NOT NULL AND phone_number IS NULL) OR (email IS NULL AND phone_number IS NOT NULL))
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT
);

-- Create conversation_participants table
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

-- Create direct_messages table
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

-- Create conversation_notifications table
CREATE TABLE public.conversation_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_chat', 'new_message', 'mention')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_preview TEXT
);

-- Create ghost_sessions table
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

-- Create ghost_session_members table
CREATE TABLE public.ghost_session_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ghost_sessions ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(session_id, user_id)
);

-- Create ghost_messages table
CREATE TABLE public.ghost_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ghost_sessions ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users NOT NULL,
  encrypted_content TEXT NOT NULL,
  message_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_settings JSONB DEFAULT '{"unreadReminderEnabled": true, "reminderTimerEnabled": true, "unreadReminderTime": 5}'::jsonb,
  security_settings JSONB DEFAULT '{"autoDeleteMessages": true, "screenshotProtection": true, "biometricLock": true, "autoDeleteTimer": 24}'::jsonb,
  appearance_settings JSONB DEFAULT '{"theme": "dark", "fontSize": "medium", "language": "en"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teams policies
CREATE POLICY "teams_insert" ON public.teams FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid()));

-- Team members policies
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('diamond_in_the_rough', 'team_lead')) OR NOT EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id));
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.team_members AS tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()));
CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "team_members_update" ON public.team_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role IN ('diamond_in_the_rough', 'team_lead')));

-- Team invitations policies
CREATE POLICY "team_invitations_select" ON public.team_invitations FOR SELECT USING (EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_invitations.team_id AND user_id = auth.uid()));
CREATE POLICY "team_invitations_insert" ON public.team_invitations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_invitations.team_id AND user_id = auth.uid() AND role IN ('diamond_in_the_rough', 'team_lead')));
CREATE POLICY "team_invitations_update" ON public.team_invitations FOR UPDATE USING (EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_invitations.team_id AND user_id = auth.uid() AND role IN ('diamond_in_the_rough', 'team_lead')));

-- Conversations policies
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid() AND is_active = true));
CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid() AND is_active = true));
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);

-- Conversation participants policies
CREATE POLICY "conversation_participants_select" ON public.conversation_participants FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid() AND cp.is_active = true));
CREATE POLICY "conversation_participants_insert" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK (true);

-- Direct messages policies
CREATE POLICY "direct_messages_select" ON public.direct_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid() AND is_active = true));
CREATE POLICY "direct_messages_insert" ON public.direct_messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = direct_messages.conversation_id AND user_id = auth.uid() AND is_active = true));
CREATE POLICY "direct_messages_update" ON public.direct_messages FOR UPDATE USING (sender_id = auth.uid());

-- Conversation notifications policies
CREATE POLICY "conversation_notifications_select" ON public.conversation_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "conversation_notifications_update" ON public.conversation_notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "conversation_notifications_insert" ON public.conversation_notifications FOR INSERT WITH CHECK (true);

-- Ghost sessions policies
CREATE POLICY "ghost_sessions_select" ON public.ghost_sessions FOR SELECT USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.ghost_session_members WHERE session_id = ghost_sessions.id AND user_id = auth.uid() AND is_active = true));
CREATE POLICY "ghost_sessions_insert" ON public.ghost_sessions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE team_id = ghost_sessions.team_id AND user_id = auth.uid()));
CREATE POLICY "ghost_sessions_update" ON public.ghost_sessions FOR UPDATE USING (created_by = auth.uid());

-- Ghost session members policies
CREATE POLICY "ghost_session_members_select" ON public.ghost_session_members FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.ghost_sessions WHERE id = ghost_session_members.session_id AND created_by = auth.uid()));
CREATE POLICY "ghost_session_members_all" ON public.ghost_session_members FOR ALL USING (EXISTS (SELECT 1 FROM public.ghost_sessions WHERE id = ghost_session_members.session_id AND created_by = auth.uid()));
CREATE POLICY "ghost_session_members_insert" ON public.ghost_session_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- Ghost messages policies
CREATE POLICY "ghost_messages_select" ON public.ghost_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.ghost_session_members WHERE session_id = ghost_messages.session_id AND user_id = auth.uid() AND is_active = true));
CREATE POLICY "ghost_messages_insert" ON public.ghost_messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.ghost_session_members WHERE session_id = ghost_messages.session_id AND user_id = auth.uid() AND is_active = true));

-- User settings policies
CREATE POLICY "user_settings_select" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_settings_update" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_settings_insert" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create handle_new_user function
CREATE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, call_sign, user_number)
  VALUES (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data ->> 'call_sign', nextval('public.user_number_seq'));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create add_creator_to_team function
CREATE FUNCTION public.add_creator_to_team()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'diamond_in_the_rough');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created AFTER INSERT ON public.teams FOR EACH ROW EXECUTE PROCEDURE public.add_creator_to_team();

-- Create accept_team_invitation function
CREATE FUNCTION public.accept_team_invitation(p_invitation_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  invitation_record public.team_invitations%ROWTYPE;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'User not authenticated'); END IF;
  SELECT * INTO invitation_record FROM public.team_invitations WHERE invitation_code = p_invitation_code AND status = 'pending' AND expires_at > now();
  IF invitation_record.id IS NULL THEN RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation'); END IF;
  IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = invitation_record.team_id AND user_id = v_user_id) THEN RETURN json_build_object('success', false, 'message', 'Already a member'); END IF;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (invitation_record.team_id, v_user_id, invitation_record.role);
  UPDATE public.team_invitations SET status = 'accepted' WHERE id = invitation_record.id;
  RETURN json_build_object('success', true, 'message', 'Joined team');
END;
$$;

-- Create find_or_create_direct_conversation function
CREATE FUNCTION public.find_or_create_direct_conversation(other_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  v_conversation_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF current_user_id = other_user_id THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;
  SELECT c.id INTO v_conversation_id FROM public.conversations c WHERE c.type = 'direct' AND EXISTS (SELECT 1 FROM public.conversation_participants cp1 WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id AND cp1.is_active = true) AND EXISTS (SELECT 1 FROM public.conversation_participants cp2 WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id AND cp2.is_active = true) AND (SELECT COUNT(*) FROM public.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.is_active = true) = 2;
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO v_conversation_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (v_conversation_id, current_user_id), (v_conversation_id, other_user_id);
    INSERT INTO public.conversation_notifications (user_id, conversation_id, type, message_preview) VALUES (other_user_id, v_conversation_id, 'new_chat', 'New conversation');
  END IF;
  RETURN v_conversation_id;
END;
$$;

-- Create search_users function
CREATE FUNCTION public.search_users(search_term TEXT)
RETURNS TABLE (id UUID, username TEXT, full_name TEXT, user_number INTEGER, avatar_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT p.id, p.username, p.full_name, p.user_number, p.avatar_url FROM public.profiles p WHERE p.id != auth.uid() AND (LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR LOWER(p.full_name) LIKE LOWER('%' || search_term || '%') OR LOWER(p.call_sign) LIKE LOWER('%' || search_term || '%') OR p.user_number::TEXT LIKE '%' || search_term || '%') ORDER BY p.username LIMIT 20;
END;
$$;

-- Create ghost session functions
CREATE FUNCTION public.create_ghost_session(p_team_id UUID, p_session_name TEXT, p_encryption_key TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE v_session_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team_id AND user_id = auth.uid()) THEN RAISE EXCEPTION 'Not a team member'; END IF;
  INSERT INTO public.ghost_sessions (created_by, team_id, session_name, encryption_key) VALUES (auth.uid(), p_team_id, p_session_name, p_encryption_key) RETURNING id INTO v_session_id;
  INSERT INTO public.ghost_session_members (session_id, user_id) VALUES (v_session_id, auth.uid());
  RETURN v_session_id;
END;
$$;

CREATE FUNCTION public.join_ghost_session(p_session_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE current_members INTEGER; max_allowed INTEGER;
BEGIN
  SELECT COUNT(gsm.user_id), gs.max_members INTO current_members, max_allowed FROM public.ghost_sessions gs LEFT JOIN public.ghost_session_members gsm ON gs.id = gsm.session_id AND gsm.is_active = true WHERE gs.id = p_session_id AND gs.is_active = true GROUP BY gs.max_members;
  IF max_allowed IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF current_members >= max_allowed THEN RAISE EXCEPTION 'Session full'; END IF;
  IF EXISTS (SELECT 1 FROM public.ghost_session_members WHERE session_id = p_session_id AND user_id = auth.uid()) THEN
    UPDATE public.ghost_session_members SET is_active = true, joined_at = now() WHERE session_id = p_session_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.ghost_session_members (session_id, user_id) VALUES (p_session_id, auth.uid());
  END IF;
  RETURN true;
END;
$$;

-- Create user settings functions
CREATE FUNCTION public.create_default_user_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_settings AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_default_user_settings();

CREATE FUNCTION public.update_user_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_user_settings_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat_attachments', 'chat_attachments', false, 26214400, NULL)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 26214400;

DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
DROP POLICY IF EXISTS "storage_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;

CREATE POLICY "storage_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat_attachments');
CREATE POLICY "storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat_attachments');
CREATE POLICY "storage_update" ON storage.objects FOR UPDATE TO authenticated USING (auth.uid() = owner);
CREATE POLICY "storage_delete" ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = owner);

-- Enable realtime
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_notifications REPLICA IDENTITY FULL;
