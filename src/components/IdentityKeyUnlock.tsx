/**
 * IdentityKeyUnlock.tsx — unlock the in-session private key on a device.
 *
 * Enter the passphrase to unlock; fall back to the one-time recovery code if the
 * passphrase is forgotten. Drives identityKeyService.unlock(). Phase 2c of the
 * E2E design doc.
 */
import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FORTRESS } from '@/lib/fortress';
import { unlock } from '@/services/identityKeyService';

interface IdentityKeyUnlockProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
}

export const IdentityKeyUnlock = ({ isOpen, onClose, onUnlocked }: IdentityKeyUnlockProps) => {
  const [secret, setSecret] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSecret('');
    setUseRecovery(false);
    setBusy(false);
    setError('');
  };

  const handleUnlock = async () => {
    if (!secret) return;
    setError('');
    setBusy(true);
    try {
      const ok = await unlock(secret, useRecovery ? 'recovery' : 'passphrase');
      if (!ok) {
        setError(useRecovery ? 'Recovery code not recognized.' : 'Incorrect passphrase.');
        return;
      }
      reset();
      onUnlocked?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-screen max-w-[100vw] rounded-none p-0 font-mono md:w-auto md:max-w-[440px] md:rounded-sm"
        style={{ background: FORTRESS.surface, borderColor: FORTRESS.borderGreen, color: FORTRESS.text }}
      >
        <DialogHeader className="flex-row items-center gap-2 border-b px-4 py-3" style={{ borderColor: FORTRESS.borderFaint }}>
          <ShieldCheck className="h-4 w-4 text-green-400" />
          <DialogTitle className="font-mono text-[13px] font-extrabold uppercase tracking-[2px] text-green-400">
            Unlock Encryption
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-4 py-4">
          <p className="font-mono text-[11px] leading-relaxed" style={{ color: FORTRESS.textDim }}>
            {useRecovery
              ? 'Enter your one-time recovery code to unlock your message keys on this device.'
              : 'Enter your passphrase to unlock your message keys on this device.'}
          </p>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: FORTRESS.textDim }} />
            <Input
              type={useRecovery ? 'text' : 'password'}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder={useRecovery ? 'Recovery code' : 'Passphrase'}
              className="pl-9 font-mono text-[12px]"
              style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceRaised, color: FORTRESS.text }}
            />
          </div>
          {error && (
            <div className="rounded-sm border px-3 py-2 font-mono text-[10px]" style={{ borderColor: FORTRESS.redBorder, background: 'rgba(255,107,97,0.08)', color: FORTRESS.red }}>
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setUseRecovery((v) => !v);
              setSecret('');
              setError('');
            }}
            className="self-start font-mono text-[9px] uppercase tracking-[1.5px] text-green-400/80 hover:text-green-300"
          >
            {useRecovery ? '← Use passphrase instead' : 'Forgot passphrase? Use recovery code'}
          </button>
          <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} className="h-auto bg-transparent px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[1.5px]" style={{ border: `1px solid ${FORTRESS.border}`, color: FORTRESS.textDim }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUnlock} disabled={busy || !secret} className="h-auto px-5 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[2px] text-[#06130B] disabled:opacity-50" style={{ background: FORTRESS.green }}>
              {busy ? 'Unlocking…' : 'Unlock'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IdentityKeyUnlock;
