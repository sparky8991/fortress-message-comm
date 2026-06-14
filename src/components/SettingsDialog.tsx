import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  Info,
  MessageSquare,
  Mic,
  Palette,
  Phone,
  ShieldCheck,
  User,
  Vibrate,
  Video,
  Volume2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUserSettings } from '@/hooks/useUserSettings';
import type {
  CallSettings,
  ChatSettings,
  NotificationSettings,
  SecuritySettings,
  ThemeSettings,
} from '@/services/userSettingsService';
import {
  ACCENT_SWATCHES,
  AUTO_DELETE_WINDOWS,
  BG_PRESETS,
  FORTRESS,
  FORTRESS_BUILD,
  FORTRESS_VERSION,
  alpha,
} from '@/lib/fortress';
import { Chip, SettingRow, Toggle } from '@/components/tactical';

export interface SettingsProfileSummary {
  callSign: string;
  email: string;
  displayName?: string;
  avatarInitials?: string;
  callSignChangesThisYear?: number;
}

export type SettingsSectionId =
  | 'profile'
  | 'security'
  | 'chat'
  | 'notifications'
  | 'calls'
  | 'theme'
  | 'about';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SettingsProfileSummary;
  initialSection?: SettingsSectionId;
  onEditProfile?: () => void;
  onEditCallSign?: () => void;
}

const SECTIONS: { id: SettingsSectionId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Operator Profile', icon: User },
  { id: 'security', label: 'Privacy & Security', icon: ShieldCheck },
  { id: 'chat', label: 'Chat Behavior', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'calls', label: 'Call Settings', icon: Phone },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'about', label: 'About', icon: Info },
];

const DEFAULT_SECURITY: SecuritySettings = {
  biometricLock: false,
  screenshotProtection: false,
  autoDeleteMessages: false,
  autoDeleteTimer: 24,
};

const DEFAULT_CHAT: ChatSettings = {
  enterToSend: true,
  showTypingIndicator: true,
  showReadReceipts: true,
  messagePreview: false,
  mediaAutoDownload: true,
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  unreadReminderEnabled: true,
  reminderTimerEnabled: true,
  unreadReminderTime: 5,
};

const DEFAULT_CALLS: CallSettings = {
  ringtoneEnabled: true,
  vibrationEnabled: true,
  autoAnswerEnabled: false,
  videoQuality: 'high',
  noiseCancellation: true,
};

const DEFAULT_THEME: ThemeSettings = {
  accentColor: FORTRESS.green,
  bubbleStyle: 'rounded',
  chatBackground: FORTRESS.bg,
  fontStyle: 'mono',
};

const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 font-mono text-[10px] uppercase tracking-[2px]" style={{ color: FORTRESS.textDim }}>
    {children}
  </div>
);

const StatusPill = ({ children }: { children: React.ReactNode }) => (
  <span
    className="rounded-sm border px-2 py-1 font-mono text-[11px] font-extrabold uppercase tracking-[1.5px]"
    style={{ borderColor: FORTRESS.amberBorder, color: FORTRESS.amber, background: alpha(FORTRESS.amber, 0.06) }}
  >
    {children}
  </span>
);

export const SettingsDialog = ({
  isOpen,
  onClose,
  profile,
  initialSection = 'profile',
  onEditProfile,
  onEditCallSign,
}: SettingsDialogProps) => {
  const {
    settings,
    updateSecuritySettings,
    updateChatSettings,
    updateNotificationSettings,
    updateCallSettings,
    updateThemeSettings,
  } = useUserSettings();
  const [section, setSection] = useState<SettingsSectionId>(initialSection);

  useEffect(() => {
    if (isOpen) setSection(initialSection);
  }, [initialSection, isOpen]);

  const security = settings?.security_settings ?? DEFAULT_SECURITY;
  const chat = settings?.chat_settings ?? DEFAULT_CHAT;
  const notifications = settings?.notification_settings ?? DEFAULT_NOTIFICATIONS;
  const calls = settings?.call_settings ?? DEFAULT_CALLS;
  const theme = settings?.theme_settings ?? DEFAULT_THEME;
  const accent = theme.accentColor || FORTRESS.green;

  const setSecurity = (patch: Partial<SecuritySettings>) => updateSecuritySettings({ ...security, ...patch });
  const setChat = (patch: Partial<ChatSettings>) => updateChatSettings({ ...chat, ...patch });
  const setNotifications = (patch: Partial<NotificationSettings>) =>
    updateNotificationSettings({ ...notifications, ...patch });
  const setCalls = (patch: Partial<CallSettings>) => updateCallSettings({ ...calls, ...patch });
  const setTheme = (patch: Partial<ThemeSettings>) => updateThemeSettings({ ...theme, ...patch });

  const remainingCallSignChanges = useMemo(
    () => Math.max(0, 3 - (profile.callSignChangesThisYear ?? 0)),
    [profile.callSignChangesThisYear]
  );

  const initials =
    profile.avatarInitials ||
    profile.callSign
      .split(/[\s_-]+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    'SC';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="h-[560px] max-h-[92vh] w-[740px] max-w-[94vw] overflow-hidden rounded-sm p-0 font-mono"
        style={{ background: FORTRESS.surface, borderColor: FORTRESS.borderGreen, color: FORTRESS.text }}
      >
        <DialogHeader
          className="flex-row items-center justify-between border-b px-4 py-[14px] pr-12"
          style={{ borderColor: FORTRESS.borderFaint }}
        >
          <DialogTitle className="font-mono text-[14px] font-extrabold uppercase tracking-[2px] text-green-400">
            Terminal Settings
          </DialogTitle>
          <span className="hidden font-mono text-[10px] uppercase tracking-[1px] sm:inline" style={{ color: FORTRESS.textFaint }}>
            Synced to account settings
          </span>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <nav className="flex w-[190px] flex-none flex-col gap-1.5 border-r px-2.5 py-3" style={{ borderColor: FORTRESS.borderFaint }}>
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className="flex items-center gap-2 rounded-sm border px-2.5 py-2 text-left font-mono text-[11px] font-bold uppercase tracking-[1.5px] transition-colors fortress-focus"
                  style={{
                    background: active ? alpha(accent, 0.1) : 'transparent',
                    borderColor: active ? alpha(accent, 0.5) : 'transparent',
                    color: active ? accent : FORTRESS.textDim,
                  }}
                >
                  <Icon className="h-3 w-3 flex-none" />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto px-[18px] py-4">
            {section === 'profile' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 rounded-sm border p-3 sm:flex-row sm:items-center" style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceRaised }}>
                  <div className="grid h-16 w-16 flex-none place-items-center rounded-sm border font-mono text-[22px] font-extrabold" style={{ borderColor: FORTRESS.borderGreen, background: '#12301F', color: FORTRESS.greenSoft }}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[14px] font-bold tracking-wide" style={{ color: FORTRESS.textBright }}>
                      {profile.callSign || 'Operator'}
                    </div>
                    <div className="truncate font-mono text-[12px]" style={{ color: FORTRESS.textDim }}>
                      {profile.email || 'Email hidden'}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: FORTRESS.green }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: FORTRESS.green }} />
                      Online · This device
                    </div>
                    <Button
                      type="button"
                      onClick={onEditProfile}
                      className="mt-2 h-auto bg-transparent px-2.5 py-1.5 font-mono text-[11px] font-extrabold uppercase tracking-[1.5px] text-green-400 hover:bg-green-500/10"
                      style={{ border: `1px solid ${FORTRESS.borderGreen}` }}
                    >
                      Edit profile
                    </Button>
                  </div>
                </div>

                <div className="rounded-sm border p-2.5" style={{ borderColor: FORTRESS.amberBorder, background: alpha(FORTRESS.amber, 0.04) }}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500" />
                    <div className="font-mono text-[11px] leading-relaxed tracking-wide text-amber-300/80">
                      <div className="font-bold text-amber-400">Call sign change limits</div>
                      Once per month. Maximum 3 changes per year.
                      <div className="mt-1 font-bold text-amber-200">Changes remaining this year: {remainingCallSignChanges}</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={onEditCallSign}
                    disabled={remainingCallSignChanges <= 0}
                    className="mt-2.5 h-auto w-full bg-transparent py-1.5 font-mono text-[11px] font-extrabold uppercase tracking-[1.5px] text-amber-300 hover:bg-amber-400/10 disabled:opacity-40"
                    style={{ border: `1px solid ${FORTRESS.amberBorder}` }}
                  >
                    Change call sign
                  </Button>
                </div>

                <div className="rounded-sm border p-2.5" style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceRaised }}>
                  <SubLabel>Identity key · Ed25519</SubLabel>
                  <div className="font-mono text-[12px] leading-[1.8] tracking-[2px]" style={{ color: FORTRESS.greenSoft }}>
                    3A7F 09C2 D481 6E5B
                  </div>
                  <div className="mt-2 font-mono text-[11px] uppercase tracking-[1px]" style={{ color: FORTRESS.textFaint }}>
                    Linked devices: Fortress-WS01 (this device) · Field-Mobile-02
                  </div>
                </div>
              </div>
            )}

            {section === 'security' && (
              <div className="flex flex-col gap-2">
                <SettingRow title="Biometric Lock" desc="Planned for supported mobile builds.">
                  <StatusPill>Coming soon</StatusPill>
                </SettingRow>
                <SettingRow title="Screenshot Protection" desc="Planned where the platform allows it.">
                  <StatusPill>Coming soon</StatusPill>
                </SettingRow>
                <SettingRow title="Auto-Delete Preference" desc="Stores your default cleanup preference for future messages.">
                  <Toggle
                    accent={accent}
                    on={security.autoDeleteMessages}
                    onClick={() => setSecurity({ autoDeleteMessages: !security.autoDeleteMessages })}
                    aria-label="Toggle auto-delete preference"
                  />
                </SettingRow>
                {security.autoDeleteMessages && (
                  <div className="rounded-sm border p-2.5" style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceSunken }}>
                    <SubLabel>Default cleanup window</SubLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {AUTO_DELETE_WINDOWS.map(({ hours, label }) => (
                        <Chip
                          key={hours}
                          label={label}
                          accent={accent}
                          active={security.autoDeleteTimer === hours}
                          onClick={() => setSecurity({ autoDeleteTimer: hours })}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-sm border p-2.5 font-mono text-[11px] leading-relaxed" style={{ borderColor: FORTRESS.borderGreen, background: alpha(FORTRESS.green, 0.06), color: FORTRESS.textDim }}>
                  <span className="font-bold text-green-400">Protected channel:</span> locked payloads use a separate decryption key. Share that key outside the chat and only with the intended recipient.
                </div>
              </div>
            )}

            {section === 'chat' && (
              <div className="flex flex-col gap-2">
                <SettingRow title="Enter to Send" desc="Press Enter to transmit messages.">
                  <Toggle accent={accent} on={chat.enterToSend} onClick={() => setChat({ enterToSend: !chat.enterToSend })} aria-label="Toggle enter to send" />
                </SettingRow>
                <SettingRow title="Typing Indicator" desc="Show when operators are typing.">
                  <Toggle accent={accent} on={chat.showTypingIndicator} onClick={() => setChat({ showTypingIndicator: !chat.showTypingIndicator })} aria-label="Toggle typing indicator" />
                </SettingRow>
                <SettingRow title="Read Receipts" desc="Confirm to senders when you have read their traffic.">
                  <Toggle accent={accent} on={chat.showReadReceipts} onClick={() => setChat({ showReadReceipts: !chat.showReadReceipts })} aria-label="Toggle read receipts" />
                </SettingRow>
                <SettingRow title="Message Preview" desc="Show message content in notifications.">
                  <Toggle accent={accent} on={chat.messagePreview} onClick={() => setChat({ messagePreview: !chat.messagePreview })} aria-label="Toggle message preview" />
                </SettingRow>
                <SettingRow title="Auto-Download Media" desc="Fetch images and files automatically when supported.">
                  <Toggle accent={accent} on={chat.mediaAutoDownload} onClick={() => setChat({ mediaAutoDownload: !chat.mediaAutoDownload })} aria-label="Toggle media auto-download" />
                </SettingRow>
              </div>
            )}

            {section === 'notifications' && (
              <div className="flex flex-col gap-2">
                <SettingRow title="Unread Message Reminders" desc="Get pinged when inbound traffic goes unread.">
                  <Toggle accent={accent} on={notifications.unreadReminderEnabled} onClick={() => setNotifications({ unreadReminderEnabled: !notifications.unreadReminderEnabled })} aria-label="Toggle unread reminders" />
                </SettingRow>
                <SettingRow title="Reminder Timer" desc="Use time-based reminder notifications.">
                  <Toggle accent={accent} on={notifications.reminderTimerEnabled} onClick={() => setNotifications({ reminderTimerEnabled: !notifications.reminderTimerEnabled })} aria-label="Toggle reminder timer" />
                </SettingRow>
                {notifications.reminderTimerEnabled && (
                  <div className="rounded-sm border p-2.5" style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceSunken }}>
                    <SubLabel>Reminder time in minutes</SubLabel>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={notifications.unreadReminderTime}
                      onBlur={(event) => setNotifications({ unreadReminderTime: Math.max(1, Number(event.target.value) || 1) })}
                      className="h-8 w-24 rounded-sm border font-mono text-[13px]"
                      style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceRaised, color: FORTRESS.text }}
                    />
                  </div>
                )}
                <div className="rounded-sm border p-2.5 font-mono text-[11px] leading-relaxed" style={{ borderColor: FORTRESS.borderGreen, background: alpha(FORTRESS.green, 0.05), color: FORTRESS.textDim }}>
                  Notification previews stay off unless you enable message preview under chat behavior.
                </div>
              </div>
            )}

            {section === 'calls' && (
              <div className="flex flex-col gap-2">
                <SettingRow title="Ringtone" desc="Play sound for incoming calls.">
                  <Toggle accent={accent} on={calls.ringtoneEnabled} onClick={() => setCalls({ ringtoneEnabled: !calls.ringtoneEnabled })} aria-label="Toggle ringtone" />
                </SettingRow>
                <SettingRow title="Vibration" desc="Vibrate for incoming calls on supported devices.">
                  <Toggle accent={accent} on={calls.vibrationEnabled} onClick={() => setCalls({ vibrationEnabled: !calls.vibrationEnabled })} aria-label="Toggle vibration" />
                </SettingRow>
                <SettingRow title="Noise Cancellation" desc="Reduce background noise during calls where supported.">
                  <Toggle accent={accent} on={calls.noiseCancellation} onClick={() => setCalls({ noiseCancellation: !calls.noiseCancellation })} aria-label="Toggle noise cancellation" />
                </SettingRow>
                <SettingRow title="Auto Answer" desc="Automatically answer incoming calls.">
                  <Toggle accent={accent} on={calls.autoAnswerEnabled} onClick={() => setCalls({ autoAnswerEnabled: !calls.autoAnswerEnabled })} aria-label="Toggle auto answer" />
                </SettingRow>
                <div className="rounded-sm border p-2.5" style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceSunken }}>
                  <SubLabel>Video quality</SubLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {(['low', 'medium', 'high'] as const).map((quality) => (
                      <Chip
                        key={quality}
                        label={quality}
                        accent={accent}
                        active={calls.videoQuality === quality}
                        onClick={() => setCalls({ videoQuality: quality })}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px] uppercase tracking-wide text-green-400/70">
                  <Volume2 className="mx-auto h-3.5 w-3.5" />
                  <Vibrate className="mx-auto h-3.5 w-3.5" />
                  <Mic className="mx-auto h-3.5 w-3.5" />
                  <Video className="mx-auto h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {section === 'theme' && (
              <div className="flex flex-col gap-4">
                <div>
                  <SubLabel>Accent color</SubLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCENT_SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setTheme({ accentColor: color })}
                        className="grid h-7 w-10 place-items-center rounded-sm font-mono text-[11px] font-extrabold text-[#06130B] fortress-focus"
                        style={{ background: color, border: `2px solid ${theme.accentColor === color ? FORTRESS.textBright : 'transparent'}` }}
                      >
                        {theme.accentColor === color ? <Check className="h-3 w-3" /> : null}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <SubLabel>Bubble style</SubLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(['rounded', 'square', 'minimal'] as const).map((bubbleStyle) => {
                      const active = theme.bubbleStyle === bubbleStyle;
                      return (
                        <button
                          key={bubbleStyle}
                          type="button"
                          onClick={() => setTheme({ bubbleStyle })}
                          className="rounded-sm p-2.5 text-center font-mono fortress-focus"
                          style={{
                            background: active ? alpha(accent, 0.08) : FORTRESS.surfaceRaised,
                            border: `1px solid ${active ? accent : FORTRESS.border}`,
                          }}
                        >
                          <div
                            className="mx-auto mb-2 h-3 w-[70%]"
                            style={{
                              background: bubbleStyle === 'minimal' ? 'transparent' : alpha(accent, 0.25),
                              border: `1px solid ${bubbleStyle === 'minimal' ? '#3A4A41' : alpha(accent, 0.6)}`,
                              borderRadius: bubbleStyle === 'rounded' ? 7 : bubbleStyle === 'square' ? 2 : 1,
                            }}
                          />
                          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: active ? accent : FORTRESS.textDim }}>
                            {bubbleStyle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <SubLabel>Chat background</SubLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {BG_PRESETS.map((background) => (
                      <button
                        key={background}
                        type="button"
                        onClick={() => setTheme({ chatBackground: background })}
                        className="grid h-8 w-12 place-items-center rounded-sm font-mono text-[11px] fortress-focus"
                        style={{
                          background,
                          border: `2px solid ${theme.chatBackground === background ? FORTRESS.textBright : FORTRESS.border}`,
                          color: FORTRESS.text,
                        }}
                      >
                        {theme.chatBackground === background ? <Check className="h-3 w-3" /> : null}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <SubLabel>Font style</SubLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(['mono', 'sans', 'serif'] as const).map((fontStyle) => {
                      const active = theme.fontStyle === fontStyle;
                      const fontFamily =
                        fontStyle === 'mono' ? 'monospace' : fontStyle === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif';
                      return (
                        <button
                          key={fontStyle}
                          type="button"
                          onClick={() => setTheme({ fontStyle })}
                          className="rounded-sm p-2.5 text-center fortress-focus"
                          style={{
                            background: active ? alpha(accent, 0.08) : FORTRESS.surfaceRaised,
                            border: `1px solid ${active ? accent : FORTRESS.border}`,
                          }}
                        >
                          <div className="ft-meta" style={{ fontFamily, color: FORTRESS.text }}>
                            Aa Bb 01
                          </div>
                          <div className="mt-1.5 font-mono text-[10px] font-extrabold uppercase tracking-wide" style={{ color: active ? accent : FORTRESS.textDim }}>
                            {fontStyle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {section === 'about' && (
              <div className="flex flex-col items-center gap-1.5 py-3 text-center">
                <div className="mb-1.5 grid h-11 w-11 place-items-center rounded-sm border border-green-500 bg-green-500/10 p-3">
                  <ShieldCheck className="h-5 w-5 text-green-400" />
                </div>
                <div className="font-mono text-[16px] font-extrabold uppercase tracking-[3px]" style={{ color: FORTRESS.textBright }}>
                  SECURECHAT FORTRESS
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: FORTRESS.textFaint }}>
                  Terminal {FORTRESS_VERSION} · Build {FORTRESS_BUILD}
                </div>
                <div className="mt-2.5 max-w-md rounded-sm border p-3 font-mono text-[11px] leading-relaxed tracking-wide" style={{ borderColor: FORTRESS.border, background: FORTRESS.surfaceRaised, color: FORTRESS.textDim }}>
                  Private team messaging with protected channels, key-locked payloads, burn-after-read controls,
                  media sharing, and call-sign based identity.
                </div>
                <div className="mt-2 grid gap-1.5 text-left font-mono text-[11px] uppercase tracking-wide" style={{ color: FORTRESS.text }}>
                  <span className="text-green-400">- Protected conversations</span>
                  <span className="text-green-400">- Key-locked encrypted media</span>
                  <span className="text-amber-300">- Biometric unlock planned for mobile</span>
                </div>
                <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: FORTRESS.textFaint }}>
                  Built by Johnathan Carlson
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: FORTRESS.borderFaint }}>
          <span className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: FORTRESS.textFaint }}>
            Changes sync to your account settings
          </span>
          <Button
            type="button"
            onClick={onClose}
            className="h-auto rounded-sm px-5 py-2 font-mono text-[12px] font-extrabold uppercase tracking-[2px] text-[#06130B]"
            style={{ background: accent }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
