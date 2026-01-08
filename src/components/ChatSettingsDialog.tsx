
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Eye, CheckCheck, Image, Bell } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { ChatSettings } from '@/services/userSettingsService';

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
    messagePreview: true,
    mediaAutoDownload: true
  });

  useEffect(() => {
    if (settings?.chat_settings) {
      setLocalSettings(settings.chat_settings);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateChatSettings(localSettings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-cyan-400">
            <MessageSquare className="w-5 h-5" />
            <span>Chat Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enter to Send */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Send className="w-5 h-5 text-green-400" />
              <div>
                <Label className="text-white font-medium">Enter to Send</Label>
                <p className="text-xs text-gray-400">Press Enter to send messages</p>
              </div>
            </div>
            <Switch
              checked={localSettings.enterToSend}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enterToSend: checked })}
            />
          </div>

          {/* Typing Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-blue-400" />
              <div>
                <Label className="text-white font-medium">Typing Indicator</Label>
                <p className="text-xs text-gray-400">Show when you're typing</p>
              </div>
            </div>
            <Switch
              checked={localSettings.showTypingIndicator}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showTypingIndicator: checked })}
            />
          </div>

          {/* Read Receipts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCheck className="w-5 h-5 text-purple-400" />
              <div>
                <Label className="text-white font-medium">Read Receipts</Label>
                <p className="text-xs text-gray-400">Let others know when you've read messages</p>
              </div>
            </div>
            <Switch
              checked={localSettings.showReadReceipts}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showReadReceipts: checked })}
            />
          </div>

          {/* Message Preview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-orange-400" />
              <div>
                <Label className="text-white font-medium">Message Preview</Label>
                <p className="text-xs text-gray-400">Show message content in notifications</p>
              </div>
            </div>
            <Switch
              checked={localSettings.messagePreview}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, messagePreview: checked })}
            />
          </div>

          {/* Media Auto-Download */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image className="w-5 h-5 text-cyan-400" />
              <div>
                <Label className="text-white font-medium">Auto-Download Media</Label>
                <p className="text-xs text-gray-400">Automatically download images and files</p>
              </div>
            </div>
            <Switch
              checked={localSettings.mediaAutoDownload}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, mediaAutoDownload: checked })}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
          <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:text-white hover:bg-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
