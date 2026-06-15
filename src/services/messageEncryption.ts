/**
 * messageEncryption.ts — wires per-conversation E2E encryption into send/read.
 *
 * Resolves the shared conversation key (my in-session private key + the peer's
 * published public key, cached per conversation), then encrypts outgoing /
 * decrypts incoming text. EVERYTHING falls back to plaintext when keys aren't
 * available (locked, not set up, or the peer has no key), so the app behaves
 * exactly as before for anyone who hasn't opted into encryption.
 *
 * Phase 3b of docs/superpowers/specs/2026-06-14-e2e-encryption-design.md.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/client';
import { getSessionPrivateKey } from '@/lib/keySession';
import {
  decryptMessage,
  deriveConversationKey,
  encryptMessage,
  packEncrypted,
  tryUnpackEncrypted,
} from '@/lib/messageCrypto';

const convKeyCache = new Map<string, Uint8Array>();

/** Drop cached conversation keys (call on lock / logout). */
export const clearConversationKeyCache = (): void => convKeyCache.clear();

const getPeerIdentityKey = async (conversationId: string): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDocs(
    query(collection(db, 'conversation_participants'), where('conversation_id', '==', conversationId)),
  );
  const other = snap.docs.map((d) => d.data()).find((p) => p.user_id && p.user_id !== user.uid);
  if (!other) return null;
  const profile = await getDoc(doc(db, 'profiles', other.user_id));
  const pub = profile.exists() ? (profile.data().identityKeyPublic as string | undefined) : undefined;
  return pub || null;
};

/** Shared conversation key, or null if encryption isn't available (locked / no peer key). */
const getConversationKey = async (conversationId: string): Promise<Uint8Array | null> => {
  const myPriv = getSessionPrivateKey();
  if (!myPriv) return null;
  const cached = convKeyCache.get(conversationId);
  if (cached) return cached;
  const peerPub = await getPeerIdentityKey(conversationId);
  if (!peerPub) return null;
  const key = await deriveConversationKey(myPriv, peerPub, conversationId);
  convKeyCache.set(conversationId, key);
  return key;
};

/** Encrypt outgoing text. Falls back to plaintext (encrypted:false) when keys are unavailable. */
export const encryptOutgoing = async (
  conversationId: string,
  content: string,
): Promise<{ content: string; encrypted: boolean }> => {
  if (!content) return { content, encrypted: false };
  try {
    const key = await getConversationKey(conversationId);
    if (!key) return { content, encrypted: false };
    return { content: packEncrypted(await encryptMessage(content, key)), encrypted: true };
  } catch {
    return { content, encrypted: false };
  }
};

/** Decrypt incoming content for display. Legacy plaintext passes through; locked/failed → placeholder. */
export const decryptIncoming = async (
  conversationId: string,
  content: string,
  encrypted: boolean,
): Promise<string> => {
  if (!encrypted) return content;
  const enc = tryUnpackEncrypted(content);
  if (!enc) return content;
  try {
    const key = await getConversationKey(conversationId);
    if (!key) return '🔒 Encrypted — unlock to read';
    const plaintext = await decryptMessage(enc, key);
    return plaintext ?? '🔒 Unable to decrypt';
  } catch {
    return '🔒 Unable to decrypt';
  }
};
