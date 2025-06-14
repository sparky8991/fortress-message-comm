
import React, { useState } from 'react';
import { Bell, Settings, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettings = ({ isOpen, onClose }: NotificationSettingsProps) => {
  const [unreadReminderEnabled, setUnreadReminderEnabled] = useState(true);
  const [unreadReminderTime, setUnreadReminderTime] = useState(5);

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
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure your message notifications and reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Unread Message Reminders</Label>
                <p className="text-sm text-gray-400">
                  Get notified when messages haven't been read
                </p>
              </div>
              <Switch
                checked={unreadReminderEnabled}
                onCheckedChange={setUnreadReminderEnabled}
              />
            </div>

            {unreadReminderEnabled && (
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
                />
                <p className="text-xs text-gray-500">
                  You'll be notified if a message isn't read within {unreadReminderTime} minute{unreadReminderTime !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
