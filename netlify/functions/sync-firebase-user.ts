import { createClient } from '@supabase/supabase-js';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type ProfileData = {
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  callSign?: string;
  avatarUrl?: string;
  photoURL?: string;
};

type FirebaseAccount = {
  localId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  providerUserInfo?: Array<{
    providerId?: string;
  }>;
};

type FirestoreDocument = {
  fields?: Record<string, { stringValue?: string; nullValue?: null }>;
};

const json = (statusCode: number, body: Record<string, JsonValue>) => ({
  statusCode,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  },
  body: JSON.stringify(body),
});

const getSupabaseServerKey = () => process.env.SUPABASE_SERVER_KEY;

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'fortress-message-comm';
const getFirebaseWebApiKey = () => process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;

const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

const getString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const getStringFromProfile = (profile: ProfileData | null, key: keyof ProfileData) =>
  profile ? getString(profile[key]) : null;

const getFirestoreString = (document: FirestoreDocument, key: string) =>
  getString(document.fields?.[key]?.stringValue);

const parseFirestoreProfile = (document: FirestoreDocument): ProfileData => ({
  email: getFirestoreString(document, 'email') || undefined,
  firstName: getFirestoreString(document, 'firstName') || undefined,
  lastName: getFirestoreString(document, 'lastName') || undefined,
  displayName: getFirestoreString(document, 'displayName') || undefined,
  callSign: getFirestoreString(document, 'callSign') || undefined,
  avatarUrl: getFirestoreString(document, 'avatarUrl') || undefined,
  photoURL: getFirestoreString(document, 'photoURL') || undefined,
});

const getFirebaseAccount = async (firebaseIdToken: string) => {
  const firebaseWebApiKey = getFirebaseWebApiKey();

  if (!firebaseWebApiKey) {
    throw new Error('Firebase web API key is not configured');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseWebApiKey)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ idToken: firebaseIdToken }),
    },
  );

  if (!response.ok) {
    throw new Error(`Firebase account lookup failed with ${response.status}`);
  }

  const data = (await response.json()) as { users?: FirebaseAccount[] };
  const [account] = data.users || [];

  if (!account?.localId) {
    throw new Error('Firebase account lookup returned no user');
  }

  return account;
};

const getFirestoreProfile = async (uid: string, firebaseIdToken: string) => {
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/profiles/${uid}`,
  );
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${firebaseIdToken}`,
    },
  });

  if (response.status === 404 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Firestore profile lookup failed with ${response.status}`);
  }

  return parseFirestoreProfile((await response.json()) as FirestoreDocument);
};

export const handler = async (event: {
  httpMethod: string;
  headers: Record<string, string | undefined>;
}) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const token = getBearerToken(event.headers.authorization || event.headers.Authorization);

    if (!token) {
      return json(401, { error: 'Missing Firebase bearer token' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServerKey = getSupabaseServerKey();

    if (!supabaseUrl || !supabaseServerKey) {
      return json(500, { error: 'Supabase server configuration is missing' });
    }

    const firebaseAccount = await getFirebaseAccount(token);
    const firebaseUid = getString(firebaseAccount.localId);

    if (!firebaseUid) {
      return json(401, { error: 'Firebase token is missing a user id' });
    }

    const profile = await getFirestoreProfile(firebaseUid, token).catch((error) => {
      console.warn('Firestore profile lookup failed during Supabase sync:', error);
      return null;
    });
    const displayName =
      getStringFromProfile(profile, 'displayName') ||
      getString(firebaseAccount.displayName) ||
      [getStringFromProfile(profile, 'firstName'), getStringFromProfile(profile, 'lastName')]
        .filter(Boolean)
        .join(' ') ||
      null;
    const callSign = getStringFromProfile(profile, 'callSign');
    const email = getString(firebaseAccount.email) || getStringFromProfile(profile, 'email');
    const avatarUrl =
      getStringFromProfile(profile, 'avatarUrl') ||
      getStringFromProfile(profile, 'photoURL') ||
      getString(firebaseAccount.photoUrl);
    const providerId = getString(firebaseAccount.providerUserInfo?.[0]?.providerId);

    const supabase = createClient(supabaseUrl, supabaseServerKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase
      .from('firebase_user_profiles')
      .upsert(
        {
          firebase_uid: firebaseUid,
          email,
          email_lower: email?.toLowerCase() || null,
          display_name: displayName,
          display_name_lower: displayName?.toLowerCase() || null,
          call_sign: callSign,
          call_sign_lower: callSign?.toLowerCase() || null,
          avatar_url: avatarUrl,
          firebase_provider: providerId,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'firebase_uid' },
      )
      .select('firebase_uid,email,display_name,call_sign,last_synced_at')
      .single();

    if (error) {
      console.error('Supabase user sync failed:', error);
      return json(500, { error: 'Unable to sync user profile' });
    }

    return json(200, { user: data });
  } catch (error) {
    console.error('Firebase user sync failed:', error);
    return json(401, { error: 'Unable to verify Firebase user' });
  }
};
