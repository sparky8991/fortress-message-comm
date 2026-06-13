
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Eye, Timer, Fingerprint } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { SecuritySettings } from '@/services/userSettingsService';

interface PrivacySecuritySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacySecuritySettings = ({ isOpen, onClose }: PrivacySecuritySettingsProps) => {
  const { settings, updateSecuritySettings } = useUserSettings();
  const [localSettings, setLocalSettings] = useState<SecuritySettings>({
    autoDeleteMessages: true,
    screenshotProtection: true,
    biometricLock: true,
    autoDeleteTimer: 24
  });

  useEffect(() => {
    if (settings?.security_settings) {
      setLocalSettings(settings.security_settings);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSecuritySettings(localSettings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#06100b] border-green-500/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-green-400 font-mono">
            <Shield className="w-5 h-5" />
            <span>Privacy & Security</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Biometric Lock */}
          <div className="flex items-center justify-between rounded border border-green-500/15 bg-green-500/5 p-3">
            <div className="flex items-center space-x-3">
              <Fingerprint className="w-5 h-5 text-purple-400" />
              <div>
                <Label className="text-white font-medium">Biometric Lock</Label>
                <p className="ft-meta text-gray-400">Coming soon for supported mobile devices</p>
              </div>
            </div>
            <Switch
              checked={false}
              disabled
            />
          </div>

          {/* Screenshot Protection */}
          <div className="flex items-center justify-between rounded border border-green-500/15 bg-green-500/5 p-3">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-blue-400" />
              <div>
                <Label className="text-white font-medium">Screenshot Protection</Label>
                <p className="ft-meta text-gray-400">Coming soon where the platform allows it</p>
              </div>
            </div>
            <Switch
              checked={false}
              disabled
            />
          </div>

          {/* Auto-Delete Messages */}
          <div className="flex items-center justify-between rounded border border-green-500/15 bg-green-500/5 p-3">
            <div className="flex items-center space-x-3">
              <Timer className="w-5 h-5 text-orange-400" />
              <div>
                <Label className="text-white font-medium">Auto-Delete Messages</Label>
                <p className="ft-meta text-gray-400">Default cleanup policy for future messages</p>
              </div>
            </div>
            <Switch
              checked={localSettings.autoDeleteMessages}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoDeleteMessages: checked })}
            />
          </div>

          {/* Auto-Delete Timer */}
          {localSettings.autoDeleteMessages && (
            <div className="pl-8 space-y-2">
              <Label className="ft-body text-gray-300">Delete messages after:</Label>
              <Select
                value={localSettings.autoDeleteTimer.toString()}
                onValueChange={(value) => setLocalSettings({ ...localSettings, autoDeleteTimer: parseInt(value) })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="1" className="text-white">1 hour</SelectItem>
                  <SelectItem value="6" className="text-white">6 hours</SelectItem>
                  <SelectItem value="12" className="text-white">12 hours</SelectItem>
                  <SelectItem value="24" className="text-white">24 hours</SelectItem>
                  <SelectItem value="48" className="text-white">48 hours</SelectItem>
                  <SelectItem value="168" className="text-white">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Encryption Info */}
          <div className="bg-green-900/20 border border-green-700/70 rounded p-3">
            <div className="flex items-center space-x-2 text-green-400 mb-1">
              <Lock className="w-4 h-4" />
              <span className="ft-body font-medium">Protected Channel</span>
            </div>
            <p className="ft-meta text-gray-400">
              Messages, locked payloads, and burn-after-read controls are protected by the app's current security rules and encryption workflow. Keep decryption keys separate from the chat.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-green-500/15">
          <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:text-white hover:bg-green-500/10">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
