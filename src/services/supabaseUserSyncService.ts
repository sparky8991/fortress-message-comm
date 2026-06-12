import type { User } from 'firebase/auth';

export const syncFirebaseUserToSupabase = async (user: User) => {
  const idToken = await user.getIdToken();
  const response = await fetch('/.netlify/functions/sync-firebase-user', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(details?.error || 'Unable to sync Firebase user to Supabase.');
  }
};
