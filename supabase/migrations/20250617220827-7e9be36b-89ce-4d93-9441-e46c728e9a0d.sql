
CREATE OR REPLACE FUNCTION public.create_ghost_session(p_team_id uuid, p_session_name text, p_encryption_key text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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
