
-- Create team invitations table
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

-- Enable RLS on team invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy for team members to view invitations for their teams
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

-- Policy for team leads and diamond to create invitations
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

-- Policy for team leads to update invitations (e.g., cancel them)
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
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Check if user is already a team member
  IF EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = invitation_record.team_id 
    AND user_id = accept_team_invitation.user_id
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
