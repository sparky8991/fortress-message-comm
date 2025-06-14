
-- Create a sequence for the unique user numbers, starting at 10011.
CREATE SEQUENCE public.user_number_seq
  START WITH 10011
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Add the user_number and bio columns to the profiles table.
-- For existing users, a unique user_number will be generated from the sequence.
-- For new users, the default will pull from the sequence.
-- The bio column is for the user's biography, with a 500 character limit.
ALTER TABLE public.profiles
ADD COLUMN user_number INTEGER NOT NULL UNIQUE DEFAULT nextval('public.user_number_seq'),
ADD COLUMN bio TEXT,
ADD CONSTRAINT bio_length_check CHECK (char_length(bio) <= 500);
