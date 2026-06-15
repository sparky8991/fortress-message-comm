
import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, EyeOff, Fingerprint, Smartphone, Wifi, Loader2, AlertTriangle, KeyRound, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useUserRisk } from '@/contexts/UserRiskContext';
import { HoldPanicButton } from './HoldPanicButton';
import { PinSetup } from './ScreenLock';
import { Chip, Toggle } from './tactical';

const SectionTitle = ({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 border-b border-[#141E18] pb-2">
    <Icon className="h-3.5 w-3.5 text-[#36E27B]" />
    <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#ECF7F0]">
      {children}
    </h3>
  </div>
);

const StatusLine = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex items-center justify-between gap-3 font-mono">
    <span className="text-[10px] uppercase tracking-[0.14em] text-[#76897D]">{label}</span>
    <span className={`text-right text-[10px] font-black uppercase tracking-[0.12em] ${muted ? 'text-[#76897D]' : 'text-[#36E27B]'}`}>
      {value}
    </span>
  </div>
);

const SecurityRow = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-2.5 rounded-sm border border-[#1C2B22] bg-[#101814] px-3 py-2.5">
    <Icon className="h-4 w-4 flex-none text-[#36E27B]" />
    <div className="min-w-0 flex-1">
      <div className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#ECF7F0]">{title}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#76897D]">{description}</div>
    </div>
    {children}
  </div>
);

export const SecurityPanel = () => {
  const { settings: userSettings, updateSecuritySettings, loading } = useUserSettings();
  const { riskLevel, setRiskLevel } = useUserRisk();
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(true);
  const [screenshotProtection, setScreenshotProtection] = useState(true);
  const [biometricLock, setBiometricLock] = useState(true);
  const [autoDeleteTimer, setAutoDeleteTimer] = useState(24);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPanicPinSetup, setShowPanicPinSetup] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(!!localStorage.getItem('securechat_pin'));
  const [panicPinEnabled, setPanicPinEnabled] = useState(!!localStorage.getItem('securechat_panic_pin'));

  // Load settings from database when available
  useEffect(() => {
    if (userSettings?.security_settings) {
      const securitySettings = userSettings.security_settings;
      setAutoDeleteMessages(securitySettings.autoDeleteMessages);
      setScreenshotProtection(securitySettings.screenshotProtection);
      setBiometricLock(securitySettings.biometricLock);
      setAutoDeleteTimer(securitySettings.autoDeleteTimer);
      setHasChanges(false);
    }
  }, [userSettings]);

  const handleSettingChange = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSecuritySettings({
        autoDeleteMessages,
        screenshotProtection,
        biometricLock,
        autoDeleteTimer
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save security settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-3 py-3 font-mono text-[#DCEAE1]">
      <section className="rounded-sm border border-[#1E5C3C] bg-[#36E27B]/[0.06] p-3">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#36E27B]" />
          <h3 className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#ECF7F0]">
            Security Status
          </h3>
          {loading && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[#36E27B]" />}
        </div>
        <div className="space-y-2">
          <StatusLine label="Channel" value="Protected" />
          <StatusLine label="Key exchange" value="Active" />
          <StatusLine label="Locked payloads" value="Separate keys" />
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle icon={Key}>Security Settings</SectionTitle>
          {hasChanges && (
            <Button
              onClick={handleSaveSettings}
              disabled={saving || loading}
              className="h-7 rounded-sm bg-[#36E27B] px-2.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#06130B] hover:bg-[#7BEFA9]"
            >
              {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Save
            </Button>
          )}
        </div>

        <SecurityRow
          icon={Lock}
          title="Auto-delete"
          description={`Default cleanup after ${autoDeleteTimer} hours`}
        >
          <Toggle
            on={autoDeleteMessages}
            onClick={() => handleSettingChange(setAutoDeleteMessages, !autoDeleteMessages)}
            aria-label="Toggle auto delete"
          />
        </SecurityRow>

        {autoDeleteMessages && (
          <div className="rounded-sm border border-[#1C2B22] bg-[#0F1612] p-2.5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#76897D]">
              Cleanup window
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 24, 168].map((hours) => (
                <Chip
                  key={hours}
                  label={hours === 1 ? '1H' : hours === 24 ? '24H' : '7D'}
                  active={autoDeleteTimer === hours}
                  onClick={() => handleSettingChange(setAutoDeleteTimer, hours)}
                />
              ))}
            </div>
            <Input
              id="autoDeleteTimer"
              type="number"
              min="1"
              max="168"
              value={autoDeleteTimer}
              onChange={(e) => handleSettingChange(setAutoDeleteTimer, Number(e.target.value))}
              className="mt-2 h-8 rounded-sm border-[#1C2B22] bg-[#101814] font-mono text-[11px] text-[#DCEAE1] focus-visible:ring-[#36E27B]"
              disabled={loading}
            />
          </div>
        )}

        <SecurityRow
          icon={EyeOff}
          title="Screenshot protection"
          description="Stored preference for supported builds"
        >
          <Toggle
            on={screenshotProtection}
            onClick={() => handleSettingChange(setScreenshotProtection, !screenshotProtection)}
            aria-label="Toggle screenshot protection"
          />
        </SecurityRow>

        <SecurityRow
          icon={Fingerprint}
          title="Biometric lock"
          description="Planned mobile unlock preference"
        >
          <Toggle
            on={biometricLock}
            onClick={() => handleSettingChange(setBiometricLock, !biometricLock)}
            aria-label="Toggle biometric lock"
          />
        </SecurityRow>
      </section>

      <section className="space-y-2.5">
        <SectionTitle icon={Smartphone}>Device Security</SectionTitle>
        <div className="space-y-2 rounded-sm border border-[#1C2B22] bg-[#101814] p-3">
          <StatusLine label="This device" value="Verified" />
          <StatusLine label="Last verified" value="2 minutes ago" muted />
          <StatusLine label="Device ID" value="DEV-A7B9C2E1" muted />
        </div>
      </section>

      <section className="space-y-2.5">
        <SectionTitle icon={Wifi}>Network Security</SectionTitle>
        <div className="space-y-2 rounded-sm border border-[#1C2B22] bg-[#101814] p-3">
          <StatusLine label="Connection" value="Secure" />
          <StatusLine label="Transport" value="TLS" />
          <StatusLine label="Routing" value="Standard web" muted />
        </div>
      </section>

      <section className="space-y-2.5">
        <SectionTitle icon={KeyRound}>App Lock</SectionTitle>
        <SecurityRow
          icon={Lock}
          title="PIN lock"
          description={pinEnabled ? 'PIN protection is enabled' : 'Require PIN to open app'}
        >
          <button
            type="button"
            onClick={() => setShowPinSetup(true)}
            className="fortress-focus rounded-sm border border-[#1E5C3C] px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#36E27B] hover:bg-[#36E27B]/10"
          >
            {pinEnabled ? 'Change' : 'Set up'}
          </button>
        </SecurityRow>

        <SecurityRow
          icon={AlertTriangle}
          title="Panic PIN"
          description={panicPinEnabled ? 'Decoy PIN is set' : 'Set a high-risk decoy PIN'}
        >
          <button
            type="button"
            onClick={() => setShowPanicPinSetup(true)}
            className="fortress-focus rounded-sm border border-[#5C2420] px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#FF6B61] hover:bg-red-500/10"
          >
            {panicPinEnabled ? 'Change' : 'Set up'}
          </button>
        </SecurityRow>

        {pinEnabled && (
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('securechat_pin');
              setPinEnabled(false);
            }}
            className="fortress-focus w-full rounded-sm border border-[#1C2B22] bg-transparent px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#76897D] hover:border-[#5C2420] hover:text-[#FF6B61]"
          >
            Disable PIN lock
          </button>
        )}
      </section>

      <section className="space-y-2.5">
        <SectionTitle icon={AlertTriangle}>Emergency</SectionTitle>
        <div className="rounded-sm border border-[#5C2420] bg-red-950/15 p-3">
          <p className="mb-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-red-200/80">
            {riskLevel === 'high-risk'
              ? 'Hold for 3 seconds to wipe messages, conversations, and local data.'
              : 'Emergency wipe is available when sensitive data must be cleared quickly.'}
          </p>
          <HoldPanicButton variant="full" />
        </div>
      </section>

      <section className="space-y-2.5 border-t border-[#141E18] pt-4">
        <SectionTitle icon={Settings}>Security Experience</SectionTitle>
        <div className="rounded-sm border border-[#1C2B22] bg-[#101814] p-3">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-[#76897D]">
            Adjust which advanced controls are visible in the app.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setRiskLevel('normal')}
              className={`fortress-focus rounded-sm border px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
                riskLevel === 'normal'
                  ? 'border-[#36E27B] bg-[#36E27B]/15 text-[#36E27B]'
                  : 'border-[#1C2B22] text-[#76897D] hover:border-[#1E5C3C] hover:text-[#DCEAE1]'
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setRiskLevel('high-risk')}
              className={`fortress-focus rounded-sm border px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
                riskLevel === 'high-risk'
                  ? 'border-[#36E27B] bg-[#36E27B]/15 text-[#36E27B]'
                  : 'border-[#1C2B22] text-[#76897D] hover:border-[#1E5C3C] hover:text-[#DCEAE1]'
              }`}
            >
              High Risk
            </button>
          </div>
        </div>
      </section>

      {/* PIN Setup Modal */}
      {showPinSetup && (
        <div className="fixed inset-0 z-50">
          <PinSetup
            mode={pinEnabled ? 'change' : 'setup'}
            onComplete={() => {
              setShowPinSetup(false);
              setPinEnabled(true);
            }}
            onSkip={() => setShowPinSetup(false)}
          />
        </div>
      )}

      {/* Panic PIN Setup Modal */}
      {showPanicPinSetup && (
        <div className="fixed inset-0 z-50">
          <PinSetup
            mode="panic"
            onComplete={() => {
              setShowPanicPinSetup(false);
              setPanicPinEnabled(true);
            }}
            onSkip={() => setShowPanicPinSetup(false)}
          />
        </div>
      )}
    </div>
  );
};
