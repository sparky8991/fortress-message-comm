import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ChatSettings } from '@/services/userSettingsService';
import { FORTRESS } from '@/lib/fortress';
import { SettingRow, Toggle } from '@/components/tactical';

interface ChatSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSettingsDialog = ({ isOpen, onClose }: ChatSettingsDialogProps) => {
  const { settings, updateChatSettings } = useUserSettings();
  const [localSettings, setLocalSettings] = useState<ChatSettings>({
    enterToSend: true,
    showTypingIndicator: true,
    showReadReceipts: true,
    messagePreview: false,
    mediaAutoDownload: true,
  });

  useEffect(() => {
    if (settings?.chat_settings) {
      setLocalSettings(settings.chat_settings);
    }
  }, [settings]);

  const setLocal = (patch: Partial<ChatSettings>) => {
    setLocalSettings((current) => ({ ...current, ...patch }));
  };

  const handleSave = async () => {
    await updateChatSettings(localSettings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md overflow-hidden rounded-sm p-0 font-mono shadow-[0_18px_80px_rgba(0,0,0,0.65)]"
        style={{ background: FORTRESS.surface, borderColor: FORTRESS.borderGreen, color: FORTRESS.text }}
      >
        <DialogHeader
          className="flex-row items-center justify-between border-b px-4 py-3 pr-12"
          style={{ borderColor: FORTRESS.borderFaint }}
        >
          <DialogTitle className="flex items-center gap-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#36E27B]">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat Behavior
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 p-4">
          <SettingRow title="Enter to Send" desc="Press Enter to transmit messages.">
            <Toggle
              on={localSettings.enterToSend}
              onClick={() => setLocal({ enterToSend: !localSettings.enterToSend })}
              aria-label="Toggle enter to send"
            />
          </SettingRow>

          <SettingRow title="Typing Indicator" desc="Show when operators are transmitting.">
            <Toggle
              on={localSettings.showTypingIndicator}
              onClick={() => setLocal({ showTypingIndicator: !localSettings.showTypingIndicator })}
              aria-label="Toggle typing indicator"
            />
          </SettingRow>

          <SettingRow title="Read Receipts" desc="Confirm to senders when traffic has been read.">
            <Toggle
              on={localSettings.showReadReceipts}
              onClick={() => setLocal({ showReadReceipts: !localSettings.showReadReceipts })}
              aria-label="Toggle read receipts"
            />
          </SettingRow>

          <SettingRow title="Message Preview" desc="Show message content in notifications.">
            <Toggle
              on={localSettings.messagePreview}
              onClick={() => setLocal({ messagePreview: !localSettings.messagePreview })}
              aria-label="Toggle message preview"
            />
          </SettingRow>

          <SettingRow title="Auto-Download Media" desc="Fetch images and files automatically when supported.">
            <Toggle
              on={localSettings.mediaAutoDownload}
              onClick={() => setLocal({ mediaAutoDownload: !localSettings.mediaAutoDownload })}
              aria-label="Toggle media auto-download"
            />
          </SettingRow>

          <div
            className="rounded-sm border px-3 py-2.5 font-mono text-[8px] uppercase leading-relaxed tracking-[0.12em]"
            style={{ borderColor: FORTRESS.borderGreen, background: 'rgba(54,226,123,0.05)', color: FORTRESS.textDim }}
          >
            Content stays sealed unless message preview is enabled.
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: FORTRESS.borderFaint }}>
          <span className="font-mono text-[7px] uppercase tracking-[0.18em]" style={{ color: FORTRESS.textFaint }}>
            Changes sync to account settings
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-auto rounded-sm px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#76897D] hover:bg-[#36E27B]/10 hover:text-[#DCEAE1]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="h-auto rounded-sm px-4 py-2 font-mono text-[8px] font-extrabold uppercase tracking-[0.16em] text-[#06130B]"
              style={{ background: FORTRESS.green }}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
