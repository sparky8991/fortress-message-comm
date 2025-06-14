
-- Create an enum for team member roles
CREATE TYPE public.team_role AS ENUM ('diamond_in_the_rough', 'team_lead', 'team_organizer', 'team_user');

-- Add role column to team_members table
ALTER TABLE public.team_members 
ADD COLUMN role public.team_role NOT NULL DEFAULT 'team_user';

-- Update existing team creators to have the "diamond in the rough" role
UPDATE public.team_members 
SET role = 'diamond_in_the_rough' 
WHERE user_id IN (
  SELECT created_by 
  FROM public.teams 
  WHERE teams.id = team_members.team_id
);

-- Update RLS policy for team_members INSERT to allow role assignment by team leads and diamonds
DROP POLICY IF EXISTS "Team members can add other users to their team." ON public.team_members;

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

-- Add policy for updating roles (only diamonds and team leads can change roles)
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

-- Update the trigger function to assign "diamond in the rough" role to team creators
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
