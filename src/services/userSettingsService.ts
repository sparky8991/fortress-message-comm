
import { supabase } from '@/integrations/supabase/client';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('notification_settings, security_settings, appearance_settings')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, create default settings
          return await this.createDefaultSettings();
        }
        throw error;
      }

      // Cast the Json types to our interfaces using unknown first
      return {
        notification_settings: data.notification_settings as unknown as NotificationSettings,
        security_settings: data.security_settings as unknown as SecuritySettings,
        appearance_settings: data.appearance_settings as unknown as AppearanceSettings,
      };
    } catch (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }
  },

  async createDefaultSettings(): Promise<UserSettings> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const defaultSettings = {
        user_id: user.id,
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
          theme: 'dark' as const,
          fontSize: 'medium' as const,
          language: 'en'
        }
      };

      const { data, error } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select('notification_settings, security_settings, appearance_settings')
        .single();

      if (error) throw error;

      // Cast the Json types to our interfaces using unknown first
      return {
        notification_settings: data.notification_settings as unknown as NotificationSettings,
        security_settings: data.security_settings as unknown as SecuritySettings,
        appearance_settings: data.appearance_settings as unknown as AppearanceSettings,
      };
    } catch (error) {
      console.error('Error creating default settings:', error);
      throw error;
    }
  },

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ notification_settings: settings as any })
        .eq('user_id', user.id);

      if (error) throw error;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ security_settings: settings as any })
        .eq('user_id', user.id);

      if (error) throw error;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ appearance_settings: settings as any })
        .eq('user_id', user.id);

      if (error) throw error;

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
