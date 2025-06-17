
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
  -- Get current user
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  -- Get invitation
  SELECT * INTO invitation_record 
  FROM public.team_invitations 
  WHERE invitation_code = accept_team_invitation.invitation_code
  AND status = 'pending'
  AND expires_at > now();

  IF invitation_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired invitation');
  END IF;

  -- Check if user is already a team member (FIXED: using correct user_id variable)
  IF EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = invitation_record.team_id 
    AND user_id = user_id  -- Fixed: was using accept_team_invitation.user_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'User is already a team member');
  END IF;

  -- Add user to team
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (invitation_record.team_id, user_id, invitation_record.role);

  -- Mark invitation as accepted
  UPDATE public.team_invitations 
  SET status = 'accepted' 
  WHERE id = invitation_record.id;

  RETURN json_build_object('success', true, 'message', 'Successfully joined team');
END;
$$;
