
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

export interface ThemeSettings {
  accentColor: string; // hex color
  bubbleStyle: 'rounded' | 'square' | 'minimal';
  chatBackground: string; // predefined or hex color
  fontStyle: 'mono' | 'sans' | 'serif';
}

export interface CallSettings {
  ringtoneEnabled: boolean;
  vibrationEnabled: boolean;
  autoAnswerEnabled: boolean;
  videoQuality: 'low' | 'medium' | 'high';
  noiseCancellation: boolean;
}

export interface ChatSettings {
  enterToSend: boolean;
  showTypingIndicator: boolean;
  showReadReceipts: boolean;
  messagePreview: boolean;
  mediaAutoDownload: boolean;
}

export interface UserSettings {
  notification_settings: NotificationSettings;
  security_settings: SecuritySettings;
  appearance_settings: AppearanceSettings;
  call_settings?: CallSettings;
  chat_settings?: ChatSettings;
  theme_settings?: ThemeSettings;
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
        },
        call_settings: {
          ringtoneEnabled: true,
          vibrationEnabled: true,
          autoAnswerEnabled: false,
          videoQuality: 'high',
          noiseCancellation: true
        },
        chat_settings: {
          enterToSend: true,
          showTypingIndicator: true,
          showReadReceipts: true,
          messagePreview: true,
          mediaAutoDownload: true
        },
        theme_settings: {
          accentColor: '#22c55e', // green-500
          bubbleStyle: 'rounded',
          chatBackground: 'default',
          fontStyle: 'mono'
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
  },

  async updateCallSettings(settings: CallSettings): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const settingsRef = doc(db, 'user_settings', user.uid);
      await updateDoc(settingsRef, {
        call_settings: settings,
        updated_at: serverTimestamp()
      });

      toast({
        title: 'Call Settings Saved',
        description: 'Your call preferences have been updated.',
      });
    } catch (error) {
      console.error('Error updating call settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save call settings. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  },

  async updateChatSettings(settings: ChatSettings): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const settingsRef = doc(db, 'user_settings', user.uid);
      await updateDoc(settingsRef, {
        chat_settings: settings,
        updated_at: serverTimestamp()
      });

      toast({
        title: 'Chat Settings Saved',
        description: 'Your chat preferences have been updated.',
      });
    } catch (error) {
      console.error('Error updating chat settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save chat settings. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  },

  async updateThemeSettings(settings: ThemeSettings): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const settingsRef = doc(db, 'user_settings', user.uid);
      await updateDoc(settingsRef, {
        theme_settings: settings,
        updated_at: serverTimestamp()
      });

      toast({
        title: 'Theme Settings Saved',
        description: 'Your theme preferences have been updated.',
      });
    } catch (error) {
      console.error('Error updating theme settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save theme settings. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }
};
