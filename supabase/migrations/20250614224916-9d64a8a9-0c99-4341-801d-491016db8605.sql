
UPDATE public.profiles
SET user_number = 999999
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'johnathan.carlson@me.com'
);
