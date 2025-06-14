
-- Create ghost mode sessions table
CREATE TABLE public.ghost_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users NOT NULL,
  team_id UUID REFERENCES public.teams NOT NULL,
  session_name TEXT NOT NULL,
  encryption_key TEXT NOT NULL, -- Enhanced encryption key for ghost mode
  max_members INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create ghost session members table
CREATE TABLE public.ghost_session_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ghost_sessions ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(session_id, user_id)
);

-- Create ghost messages table for enhanced encryption
CREATE TABLE public.ghost_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ghost_sessions ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users NOT NULL,
  encrypted_content TEXT NOT NULL, -- Double-encrypted content
  message_hash TEXT NOT NULL, -- For message integrity
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for ghost mode tables
ALTER TABLE public.ghost_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_messages ENABLE ROW LEVEL SECURITY;

-- Ghost sessions policies
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

-- Ghost session members policies
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

-- Ghost messages policies
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

-- Add user presence status for ghost mode
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghost_mode_active BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Function to create a ghost session
CREATE OR REPLACE FUNCTION public.create_ghost_session(
  p_team_id UUID,
  p_session_name TEXT,
  p_encryption_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id UUID;
BEGIN
  -- Check if user is team member
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = p_team_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  -- Create ghost session
  INSERT INTO public.ghost_sessions (created_by, team_id, session_name, encryption_key)
  VALUES (auth.uid(), p_team_id, p_session_name, p_encryption_key)
  RETURNING id INTO session_id;

  -- Add creator as first member
  INSERT INTO public.ghost_session_members (session_id, user_id)
  VALUES (session_id, auth.uid());

  RETURN session_id;
END;
$$;

-- Function to join a ghost session
CREATE OR REPLACE FUNCTION public.join_ghost_session(
  p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_members INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current member count and max allowed
  SELECT 
    COUNT(gsm.user_id),
    gs.max_members
  INTO current_members, max_allowed
  FROM public.ghost_sessions gs
  LEFT JOIN public.ghost_session_members gsm ON gs.id = gsm.session_id AND gsm.is_active = true
  WHERE gs.id = p_session_id AND gs.is_active = true
  GROUP BY gs.max_members;

  -- Check if session exists and is active
  IF max_allowed IS NULL THEN
    RAISE EXCEPTION 'Ghost session not found or inactive';
  END IF;

  -- Check if session is full
  IF current_members >= max_allowed THEN
    RAISE EXCEPTION 'Ghost session is full (max % members)', max_allowed;
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.ghost_session_members 
    WHERE session_id = p_session_id AND user_id = auth.uid()
  ) THEN
    -- Reactivate if inactive
    UPDATE public.ghost_session_members 
    SET is_active = true, joined_at = now()
    WHERE session_id = p_session_id AND user_id = auth.uid();
  ELSE
    -- Add new member
    INSERT INTO public.ghost_session_members (session_id, user_id)
    VALUES (p_session_id, auth.uid());
  END IF;

  RETURN true;
END;
$$;
