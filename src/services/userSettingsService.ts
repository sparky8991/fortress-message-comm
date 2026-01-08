
import { db, auth } from '@/integrations/firebase/client';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export interface NotificationSettings {
  unreadReminderEnabled: boolean;
  reminderTimerEnabled: boolean;
  unreadReminderTime: number;
}

export interface SecuritySettings {
  autoDeleteMessages: boolean;
  screenshotProtection: boolean;
  biometricLock: boolean;
  autoDeleteTimer: number;
}

export interface AppearanceSettings {
  theme: 'dark' | 'light';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
}

export interface UserSettings {
  notification_settings: NotificationSettings;
  security_settings: SecuritySettings;
  appearance_settings: AppearanceSettings;
}

export const userSettingsService = {
  async getUserSettings(): Promise<UserSettings | null> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const settingsRef = doc(db, 'user_settings', user.uid);
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        return await this.createDefaultSettings();
      }

      const data = settingsSnap.data();
      return {
        notification_settings: data.notification_settings as NotificationSettings,
        security_settings: data.security_settings as SecuritySettings,
        appearance_settings: data.appearance_settings as AppearanceSettings,
      };
    } catch (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }
  },

  async createDefaultSettings(): Promise<UserSettings> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const defaultSettings: UserSettings = {
        notification_settings: {
          unreadReminderEnabled: true,
          reminderTimerEnabled: true,
          unreadReminderTime: 5
        },
        security_settings: {
          autoDeleteMessages: true,
          screenshotProtection: true,
          biometricLock: true,
          autoDeleteTimer: 24
        },
        appearance_settings: {
          theme: 'dark',
          fontSize: 'medium',
          language: 'en'
        }
      };

      const settingsRef = doc(db, 'user_settings', user.uid);
      await setDoc(settingsRef, {
        user_id: user.uid,
        ...defaultSettings,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return defaultSettings;
    } catch (error) {
      console.error('Error creating default settings:', error);
      throw error;
    }
  },

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const settingsRef = doc(db, 'user_settings', user.uid);
      await updateDoc(settingsRef, {
        notification_settings: settings,
        updated_at: serverTimestamp()
      });

      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save notification settings. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  },

  async updateSecuritySettings(settings: SecuritySettings): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const settingsRef = doc(db, 'user_settings', user.uid);
      await updateDoc(settingsRef, {
        security_settings: settings,
        updated_at: serverTimestamp()
      });

      toast({
        title: 'Security Settings Saved',
        description: 'Your security preferences have been updated.',
      });
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save security settings. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  },

  async updateAppearanceSettings(settings: AppearanceSettings): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const settingsRef = doc(db, 'user_settings', user.uid);
      await updateDoc(settingsRef, {
        appearance_settings: settings,
        updated_at: serverTimestamp()
      });

      toast({
        title: 'Appearance Settings Saved',
        description: 'Your appearance preferences have been updated.',
      });
    } catch (error) {
      console.error('Error updating appearance settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save appearance settings. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }
};
