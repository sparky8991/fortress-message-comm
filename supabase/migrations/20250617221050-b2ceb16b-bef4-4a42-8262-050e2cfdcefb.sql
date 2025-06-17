
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
