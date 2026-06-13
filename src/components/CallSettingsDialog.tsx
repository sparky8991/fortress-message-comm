
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Phone, Volume2, Vibrate, Video, Mic } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { CallSettings } from '@/services/userSettingsService';

interface CallSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CallSettingsDialog = ({ isOpen, onClose }: CallSettingsDialogProps) => {
  const { settings, updateCallSettings } = useUserSettings();
  const [localSettings, setLocalSettings] = useState<CallSettings>({
    ringtoneEnabled: true,
    vibrationEnabled: true,
    autoAnswerEnabled: false,
    videoQuality: 'high',
    noiseCancellation: true
  });

  useEffect(() => {
    if (settings?.call_settings) {
      setLocalSettings(settings.call_settings);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateCallSettings(localSettings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-orange-400">
            <Phone className="w-5 h-5" />
            <span>Call Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Ringtone */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Volume2 className="w-5 h-5 text-blue-400" />
              <div>
                <Label className="text-white font-medium">Ringtone</Label>
                <p className="ft-meta text-gray-400">Play sound for incoming calls</p>
              </div>
            </div>
            <Switch
              checked={localSettings.ringtoneEnabled}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, ringtoneEnabled: checked })}
            />
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Vibrate className="w-5 h-5 text-purple-400" />
              <div>
                <Label className="text-white font-medium">Vibration</Label>
                <p className="ft-meta text-gray-400">Vibrate for incoming calls</p>
              </div>
            </div>
            <Switch
              checked={localSettings.vibrationEnabled}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, vibrationEnabled: checked })}
            />
          </div>

          {/* Noise Cancellation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mic className="w-5 h-5 text-green-400" />
              <div>
                <Label className="text-white font-medium">Noise Cancellation</Label>
                <p className="ft-meta text-gray-400">Reduce background noise during calls</p>
              </div>
            </div>
            <Switch
              checked={localSettings.noiseCancellation}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, noiseCancellation: checked })}
            />
          </div>

          {/* Auto Answer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-cyan-400" />
              <div>
                <Label className="text-white font-medium">Auto Answer</Label>
                <p className="ft-meta text-gray-400">Automatically answer incoming calls</p>
              </div>
            </div>
            <Switch
              checked={localSettings.autoAnswerEnabled}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoAnswerEnabled: checked })}
            />
          </div>

          {/* Video Quality */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Video className="w-5 h-5 text-red-400" />
              <Label className="text-white font-medium">Video Quality</Label>
            </div>
            <Select
              value={localSettings.videoQuality}
              onValueChange={(value: 'low' | 'medium' | 'high') => setLocalSettings({ ...localSettings, videoQuality: value })}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="low" className="text-white">Low (saves data)</SelectItem>
                <SelectItem value="medium" className="text-white">Medium (balanced)</SelectItem>
                <SelectItem value="high" className="text-white">High (best quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
          <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:text-white hover:bg-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
