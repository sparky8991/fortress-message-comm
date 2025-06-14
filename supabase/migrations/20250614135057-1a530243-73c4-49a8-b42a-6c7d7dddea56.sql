
-- Create a table for teams
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create a junction table for team members
CREATE TABLE public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for the 'teams' table
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

-- RLS Policies for the 'team_members' table
CREATE POLICY "Team members can add other users to their team."
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_id AND team_members.user_id = auth.uid()
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

-- Trigger to automatically add the team creator as a member
CREATE OR REPLACE FUNCTION public.add_creator_to_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE PROCEDURE public.add_creator_to_team();
