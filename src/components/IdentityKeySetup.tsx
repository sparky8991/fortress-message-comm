/**
 * IdentityKeySetup.tsx — first-time encryption key setup.
 *
 * Step 1: choose a passphrase (>=10 chars). Step 2: show the one-time recovery
 * code exactly once and require the user to confirm they saved it. Drives
 * identityKeyService.setupIdentityKeys(). Phase 2c of the E2E design doc.
 */
import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FORTRESS } from '@/lib/fortress';
import { setupIdentityKeys } from '@/services/identityKeyService';
import { toast } from '@/hooks/use-toast';

interface IdentityKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const MIN_PASSPHRASE = 10;

export const IdentityKeySetup = ({ isOpen, onClose, onComplete }: IdentityKeySetupProps) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setPassphrase('');
    setConfirm('');
    setRecoveryCode(null);
    setBusy(false);
    setStatus('');
    setError('');
  };

  const handleCreate = async () => {
    if (passphrase.length < MIN_PASSPHRASE) {
      setError(`[V01] Passphrase must be at least ${MIN_PASSPHRASE} characters.`);
      return;
    }
    if (passphrase !== confirm) {
      setError('[V02] Passphrases do not match — re-type both to be sure.');
      return;
    }
    setError('');
    setStatus('');
    setBusy(true);
    try {
      const result = await setupIdentityKeys(passphrase, (code, label) => setStatus(`${code} · ${label}…`));
      setRecoveryCode(result.recoveryCode);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.error('[E2E-SETUP] failed:', err);
      setError(`[${err?.code ?? 'ERR'}] ${err?.message ?? 'Could not set up encryption. Please try again.'}`);
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const handleDone = () => {
    reset();
    onComplete?.();
    onClose();
  };

  const copyRecovery = async () => {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
      toast({ title: 'Recovery code copied', description: 'Store it somewhere safe and private.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Select and copy the code manually.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && recoveryCode === null && onClose()}>
      <DialogContent
        className="w-screen max-w-[100vw] rounded-none p-0 font-mono md:w-auto md:max-w-[460px] md:rounded-sm"
        style={{ background: FORTRESS.surface, borderColor: FORTRESS.borderGreen, color: FORTRESS.text }}
      >
        <DialogHeader className="flex-row items-center gap-2 border-b px-4 py-3" style={{ borderColor: FORTRESS.borderFaint }}>
          <ShieldCheck className="h-4 w-4 text-green-400" />
          <DialogTitle className="font-mono text-[13px] font-extrabold uppercase tracking-[2px] text-green-400">
            Set Up Encryption
          </DialogTitle>
        </DialogHeader>

        {recoveryCode === null ? (
          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="font-mono text-[11px] leading-relaxed" style={{ color: FORTRESS.textDim }}>
              Choose a passphrase to protect your message keys. You'll enter it to unlock encryption on
              each device. Make it long and memorable — it can't be reset without your recovery code.
            </p>
            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[2px]" style={{ color: FORTRESS.textDim }}>Passphrase</div>
              <Input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="At least 10 characters"
                className="font-mono text-[12px]"
                style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceRaised, color: FORTRESS.text }}
              />
            </div>
            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[2px]" style={{ color: FORTRESS.textDim }}>Confirm passphrase</div>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Re-enter passphrase"
                className="font-mono text-[12px]"
                style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceRaised, color: FORTRESS.text }}
              />
            </div>
            {busy && status && (
              <div className="rounded-sm border px-3 py-2 font-mono text-[10px]" style={{ borderColor: FORTRESS.borderGreen, background: 'rgba(54,226,123,0.06)', color: FORTRESS.greenSoft }}>
                {status}
              </div>
            )}
            {error && (
              <div className="rounded-sm border px-3 py-2 font-mono text-[10px]" style={{ borderColor: FORTRESS.redBorder, background: 'rgba(255,107,97,0.08)', color: FORTRESS.red }}>
                {error}
              </div>
            )}
            <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" onClick={onClose} className="h-auto bg-transparent px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[1.5px]" style={{ border: `1px solid ${FORTRESS.border}`, color: FORTRESS.textDim }}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={busy} className="h-auto px-5 py-2.5 font-mono text-[11px] font-extrabold uppercase tracking-[2px] text-[#06130B] disabled:opacity-50" style={{ background: FORTRESS.green }}>
                {busy ? 'Generating…' : 'Continue'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-start gap-2 rounded-sm border p-3" style={{ borderColor: FORTRESS.amberBorder, background: 'rgba(242,180,60,0.06)' }}>
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-400" />
              <p className="font-mono text-[10px] leading-relaxed text-amber-300/90">
                Save this recovery code now. It's the <span className="font-bold">only</span> way back in if you forget
                your passphrase — we can't recover it for you.
              </p>
            </div>
            <div className="rounded-sm border p-3 text-center" style={{ borderColor: FORTRESS.borderGreen, background: FORTRESS.surfaceRaised }}>
              <div className="font-mono text-[14px] font-bold tracking-[3px]" style={{ color: FORTRESS.greenSoft }}>{recoveryCode}</div>
            </div>
            <Button type="button" onClick={copyRecovery} className="h-auto bg-transparent px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-green-400" style={{ border: `1px solid ${FORTRESS.borderGreen}` }}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy recovery code
            </Button>
            <Button type="button" onClick={handleDone} className="mt-1 h-auto px-5 py-3 font-mono text-[11px] font-extrabold uppercase tracking-[2px] text-[#06130B]" style={{ background: FORTRESS.green }}>
              <Check className="mr-2 h-4 w-4" /> I've saved it — done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IdentityKeySetup;
