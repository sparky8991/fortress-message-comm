
import React, { useState, useEffect } from 'react';
import { Bell, Settings, Clock, Timer, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserSettings } from '@/hooks/useUserSettings';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    unreadReminderEnabled: boolean;
    reminderTimerEnabled: boolean;
    unreadReminderTime: number;
  };
  onSave: (settings: {
    unreadReminderEnabled: boolean;
    reminderTimerEnabled: boolean;
    unreadReminderTime: number;
  }) => void;
}

export const NotificationSettings = ({ isOpen, onClose, settings: propSettings, onSave }: NotificationSettingsProps) => {
  const { settings: userSettings, updateNotificationSettings, loading } = useUserSettings();
  const [unreadReminderEnabled, setUnreadReminderEnabled] = useState(propSettings.unreadReminderEnabled);
  const [reminderTimerEnabled, setReminderTimerEnabled] = useState(propSettings.reminderTimerEnabled);
  const [unreadReminderTime, setUnreadReminderTime] = useState(propSettings.unreadReminderTime);
  const [saving, setSaving] = useState(false);

  // Load settings from database when component mounts or userSettings change
  useEffect(() => {
    if (userSettings?.notification_settings) {
      const dbSettings = userSettings.notification_settings;
      setUnreadReminderEnabled(dbSettings.unreadReminderEnabled);
      setReminderTimerEnabled(dbSettings.reminderTimerEnabled);
      setUnreadReminderTime(dbSettings.unreadReminderTime);
    }
  }, [userSettings]);

  // Update local state when prop settings change (fallback)
  useEffect(() => {
    if (!userSettings) {
      setUnreadReminderEnabled(propSettings.unreadReminderEnabled);
      setReminderTimerEnabled(propSettings.reminderTimerEnabled);
      setUnreadReminderTime(propSettings.unreadReminderTime);
    }
  }, [propSettings, userSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newSettings = {
        unreadReminderEnabled,
        reminderTimerEnabled,
        unreadReminderTime
      };

      // Save to database via the hook
      await updateNotificationSettings(newSettings);
      
      // Also call the prop callback for backward compatibility
      onSave(newSettings);
      
      onClose();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Bell className="w-5 h-5 text-green-500" />
              <span>Notification Settings</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure your message notifications and reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white flex items-center space-x-2">
                  {unreadReminderEnabled ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span>Unread Message Reminders</span>
                </Label>
                <p className="ft-body text-gray-400">
                  Get notified when messages haven't been read
                </p>
              </div>
              <Switch
                checked={unreadReminderEnabled}
                onCheckedChange={setUnreadReminderEnabled}
                disabled={loading}
              />
            </div>

            {unreadReminderEnabled && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-white flex items-center space-x-2">
                    {reminderTimerEnabled ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                    <span>Reminder Timer</span>
                  </Label>
                  <p className="ft-body text-gray-400">
                    Enable time-based reminder notifications
                  </p>
                </div>
                <Switch
                  checked={reminderTimerEnabled}
                  onCheckedChange={setReminderTimerEnabled}
                  disabled={loading}
                />
              </div>
            )}

            {unreadReminderEnabled && reminderTimerEnabled && (
              <div className="space-y-2">
                <Label htmlFor="reminderTime" className="text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Reminder time (minutes)</span>
                </Label>
                <Input
                  id="reminderTime"
                  type="number"
                  min="1"
                  max="60"
                  value={unreadReminderTime}
                  onChange={(e) => setUnreadReminderTime(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-white"
                  disabled={loading}
                />
                <p className="ft-meta text-gray-500">
                  You'll be notified if a message isn't read within {unreadReminderTime} minute{unreadReminderTime !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300" disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={saving || loading}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
