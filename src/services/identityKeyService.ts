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
import { getSodium } from '@/lib/sodium';
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

/** Coded error so the dialog + console show exactly which setup step failed. */
export class SetupError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'SetupError';
  }
}

export type SetupStep = 'E10' | 'E20' | 'E30' | 'E40' | 'E50' | 'E60' | 'E99';

const STEP_LABEL: Record<SetupStep, string> = {
  E10: 'Initializing crypto engine',
  E20: 'Generating identity key',
  E30: 'Generating recovery code',
  E40: 'Encrypting keys (Argon2id)',
  E50: 'Computing fingerprint',
  E60: 'Saving to secure profile',
  E99: 'Done',
};

/**
 * Run one setup step under a time budget. If it overruns, reject with a coded
 * SetupError instead of hanging forever — so a stuck step surfaces as e.g.
 * "[E10] Initializing crypto engine timed out after 20s" rather than a frozen button.
 */
const step = async <T>(code: SetupStep, ms: number, run: () => Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new SetupError(code, `${STEP_LABEL[code]} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
  });
  try {
    return await Promise.race([run(), timeout]);
  } finally {
    clearTimeout(timer!);
  }
};

/**
 * First-time setup: generate an X25519 identity keypair, wrap the private key under
 * BOTH the passphrase and a one-time recovery code, publish the public key, and cache
 * the private key in-session. Returns the recovery code to display exactly once.
 *
 * Each step reports a code via onProgress (for a live status line) and is bounded by a
 * timeout, so a hang or failure surfaces as a labelled code instead of a silent freeze.
 */
export const setupIdentityKeys = async (
  passphrase: string,
  onProgress?: (code: SetupStep, label: string) => void,
): Promise<{ recoveryCode: string }> => {
  const user = auth.currentUser;
  if (!user) throw new SetupError('ERR-AUTH', 'Not signed in. Sign in again, then retry.');

  const report = (code: SetupStep) => {
    // Step codes/labels only — never log keys, the passphrase, or the recovery code.
    console.log(`[E2E-SETUP] ${code} ${STEP_LABEL[code]}`);
    onProgress?.(code, STEP_LABEL[code]);
  };

  report('E10');
  await step('E10', 20000, () => getSodium());

  report('E20');
  const keyPair = await step('E20', 15000, () => generateIdentityKeyPair());

  report('E30');
  const recoveryCode = await step('E30', 15000, () => generateRecoveryCode());

  report('E40');
  const [wrappedPrivateKey, wrappedPrivateKeyByRecovery] = await step('E40', 30000, () =>
    Promise.all([
      wrapPrivateKey(keyPair.privateKey, passphrase),
      wrapPrivateKey(keyPair.privateKey, recoveryCode),
    ]),
  );

  report('E50');
  const identityKeyFingerprint = await step('E50', 15000, () => fingerprint(keyPair.publicKey));

  report('E60');
  try {
    await step('E60', 20000, () =>
      setDoc(
        profileRef(user.uid),
        {
          identityKeyPublic: keyPair.publicKey,
          identityKeyFingerprint,
          identityKeyUpdatedAt: serverTimestamp(),
          wrappedPrivateKey,
          wrappedPrivateKeyByRecovery,
        },
        { merge: true },
      ),
    );
  } catch (e) {
    if (e instanceof SetupError) throw e; // step timeout — already coded
    const fbCode = (e as { code?: string })?.code ?? 'unknown';
    throw new SetupError('ERR-WRITE', `Could not save keys to your profile (${fbCode}).`);
  }

  setSessionPrivateKey(keyPair.privateKey);
  report('E99');
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
