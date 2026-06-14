/**
 * identityKeyService.ts — bootstrap + unlock of the operator's identity key.
 *
 * Persistence + orchestration around the tested crypto in lib/identityKeys.ts.
 * Modeled on conversationService.ts (same db/auth imports, same async style).
 *
 * Data written to profiles/{uid} (owner-write only, per Firestore rules):
 *   identityKeyPublic, identityKeyFingerprint, identityKeyUpdatedAt,
 *   wrappedPrivateKey (sealed by passphrase), wrappedPrivateKeyByRecovery
 *   (sealed by the one-time recovery code). Each wrapped blob self-contains its
 *   Argon2id params, so no separate params field is needed.
 *
 * The unwrapped private key is held only in keySession (memory). Secrets and
 * keys are never logged. Phase 2c of the E2E design doc.
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/client';
import {
  generateIdentityKeyPair,
  generateRecoveryCode,
  unwrapPrivateKey,
  wrapPrivateKey,
  type WrappedKey,
} from '@/lib/identityKeys';
import { fingerprint } from '@/lib/safetyNumber';
import { clearSessionPrivateKey, isUnlocked, setSessionPrivateKey } from '@/lib/keySession';
import { clearConversationKeyCache } from './messageEncryption';

export type KeyState = 'none' | 'locked' | 'unlocked';

interface IdentityKeyFields {
  identityKeyPublic?: string;
  identityKeyFingerprint?: string;
  wrappedPrivateKey?: WrappedKey;
  wrappedPrivateKeyByRecovery?: WrappedKey;
}

const profileRef = (uid: string) => doc(db, 'profiles', uid);

const readKeyFields = async (uid: string): Promise<IdentityKeyFields> => {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? (snap.data() as IdentityKeyFields) : {};
};

/** Whether the current user has published an identity key, and if it's unlocked this session. */
export const getKeyState = async (): Promise<KeyState> => {
  const user = auth.currentUser;
  if (!user) return 'none';
  const fields = await readKeyFields(user.uid);
  if (!fields.identityKeyPublic || !fields.wrappedPrivateKey) return 'none';
  return isUnlocked() ? 'unlocked' : 'locked';
};

/**
 * First-time setup: generate an X25519 identity keypair, wrap the private key under
 * BOTH the passphrase and a one-time recovery code, publish the public key, and cache
 * the private key in-session. Returns the recovery code to display exactly once.
 */
export const setupIdentityKeys = async (passphrase: string): Promise<{ recoveryCode: string }> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const keyPair = await generateIdentityKeyPair();
  const recoveryCode = await generateRecoveryCode();
  const [wrappedPrivateKey, wrappedPrivateKeyByRecovery] = await Promise.all([
    wrapPrivateKey(keyPair.privateKey, passphrase),
    wrapPrivateKey(keyPair.privateKey, recoveryCode),
  ]);
  const identityKeyFingerprint = await fingerprint(keyPair.publicKey);

  await setDoc(
    profileRef(user.uid),
    {
      identityKeyPublic: keyPair.publicKey,
      identityKeyFingerprint,
      identityKeyUpdatedAt: serverTimestamp(),
      wrappedPrivateKey,
      wrappedPrivateKeyByRecovery,
    },
    { merge: true },
  );

  setSessionPrivateKey(keyPair.privateKey);
  return { recoveryCode };
};

/** Unlock the in-session private key with the passphrase (or recovery code). Returns success. */
export const unlock = async (
  secret: string,
  via: 'passphrase' | 'recovery' = 'passphrase',
): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;
  const fields = await readKeyFields(user.uid);
  const wrapped = via === 'recovery' ? fields.wrappedPrivateKeyByRecovery : fields.wrappedPrivateKey;
  if (!wrapped) return false;
  const privateKey = await unwrapPrivateKey(wrapped, secret);
  if (!privateKey) return false;
  setSessionPrivateKey(privateKey);
  return true;
};

/** Clear the in-memory private key + cached conversation keys (call on logout / lock). */
export const lockIdentityKeys = (): void => {
  clearSessionPrivateKey();
  clearConversationKeyCache();
};
