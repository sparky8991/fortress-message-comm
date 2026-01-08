
import { useState, useEffect, useCallback } from 'react';
import { userSettingsService, UserSettings, NotificationSettings, SecuritySettings, AppearanceSettings, CallSettings, ChatSettings, ThemeSettings } from '@/services/userSettingsService';

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userSettings = await userSettingsService.getUserSettings();
      setSettings(userSettings);
    } catch (err) {
      console.error('Error loading user settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateNotificationSettings = useCallback(async (newSettings: NotificationSettings) => {
    try {
      await userSettingsService.updateNotificationSettings(newSettings);
      if (settings) {
        setSettings({
          ...settings,
          notification_settings: newSettings
        });
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }, [settings]);

  const updateSecuritySettings = useCallback(async (newSettings: SecuritySettings) => {
    try {
      await userSettingsService.updateSecuritySettings(newSettings);
      if (settings) {
        setSettings({
          ...settings,
          security_settings: newSettings
        });
      }
    } catch (error) {
      console.error('Failed to update security settings:', error);
    }
  }, [settings]);

  const updateAppearanceSettings = useCallback(async (newSettings: AppearanceSettings) => {
    try {
      await userSettingsService.updateAppearanceSettings(newSettings);
      if (settings) {
        setSettings({
          ...settings,
          appearance_settings: newSettings
        });
      }
    } catch (error) {
      console.error('Failed to update appearance settings:', error);
    }
  }, [settings]);

  const updateCallSettings = useCallback(async (newSettings: CallSettings) => {
    try {
      await userSettingsService.updateCallSettings(newSettings);
      if (settings) {
        setSettings({
          ...settings,
          call_settings: newSettings
        });
      }
    } catch (error) {
      console.error('Failed to update call settings:', error);
    }
  }, [settings]);

  const updateChatSettings = useCallback(async (newSettings: ChatSettings) => {
    try {
      await userSettingsService.updateChatSettings(newSettings);
      if (settings) {
        setSettings({
          ...settings,
          chat_settings: newSettings
        });
      }
    } catch (error) {
      console.error('Failed to update chat settings:', error);
    }
  }, [settings]);

  const updateThemeSettings = useCallback(async (newSettings: ThemeSettings) => {
    try {
      await userSettingsService.updateThemeSettings(newSettings);
      if (settings) {
        setSettings({
          ...settings,
          theme_settings: newSettings
        });
      }
    } catch (error) {
      console.error('Failed to update theme settings:', error);
    }
  }, [settings]);

  return {
    settings,
    loading,
    error,
    updateNotificationSettings,
    updateSecuritySettings,
    updateAppearanceSettings,
    updateCallSettings,
    updateChatSettings,
    updateThemeSettings,
    refreshSettings: loadSettings
  };
};
