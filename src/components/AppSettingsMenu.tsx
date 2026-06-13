import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Info,
  LogOut,
  MessageSquare,
  Palette,
  Phone,
  Shield,
  Settings,
  User,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/integrations/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AboutDialog } from './AboutDialog';
import { CallSettingsDialog } from './CallSettingsDialog';
import { ChatSettingsDialog } from './ChatSettingsDialog';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySecuritySettings } from './PrivacySecuritySettings';
import { ThemeSettingsDialog } from './ThemeSettingsDialog';

interface AppSettingsMenuProps {
  triggerClassName?: string;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Failed to log out. Please try again.';

export const AppSettingsMenu = ({ triggerClassName }: AppSettingsMenuProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: userSettings } = useUserSettings();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrivacySecurity, setShowPrivacySecurity] = useState(false);
  const [showCallSettings, setShowCallSettings] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [fallbackNotificationSettings, setFallbackNotificationSettings] = useState({
    unreadReminderEnabled: true,
    reminderTimerEnabled: true,
    unreadReminderTime: 5,
  });

  const currentNotificationSettings =
    userSettings?.notification_settings || fallbackNotificationSettings;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      navigate('/auth');
    } catch (error: unknown) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={triggerClassName}
            title="Open settings"
            aria-label="Open settings menu"
          >
            <Settings className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-60 bg-[#06100b] border-green-500/20 text-white shadow-xl"
          sideOffset={8}
        >
          <DropdownMenuLabel className="text-green-400 font-mono text-xs tracking-[0.16em] uppercase">
            Terminal Settings
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-green-500/15" />

          <DropdownMenuItem
            onClick={() => navigate('/profile-settings')}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <User className="mr-2 h-4 w-4 text-green-500" />
            <span>Operator Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowNotifications(true)}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Bell className="mr-2 h-4 w-4 text-blue-500" />
            <span>Notifications</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-green-500/15" />

          <DropdownMenuItem
            onClick={() => setShowPrivacySecurity(true)}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Shield className="mr-2 h-4 w-4 text-purple-500" />
            <span>Privacy & Security</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowCallSettings(true)}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Phone className="mr-2 h-4 w-4 text-orange-500" />
            <span>Call Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowChatSettings(true)}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <MessageSquare className="mr-2 h-4 w-4 text-cyan-500" />
            <span>Chat Behavior</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowThemeSettings(true)}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Palette className="mr-2 h-4 w-4 text-pink-500" />
            <span>Terminal Theme</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-green-500/15" />

          <DropdownMenuItem
            onClick={() => setShowAbout(true)}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Info className="mr-2 h-4 w-4 text-gray-400" />
            <span>About SecureChat</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-green-500/15" />

          <DropdownMenuItem
            onClick={handleLogout}
            className="hover:bg-red-900/50 focus:bg-red-900/50 cursor-pointer text-red-400 hover:text-red-300"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationSettings
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        settings={currentNotificationSettings}
        onSave={setFallbackNotificationSettings}
      />
      <PrivacySecuritySettings
        isOpen={showPrivacySecurity}
        onClose={() => setShowPrivacySecurity(false)}
      />
      <CallSettingsDialog
        isOpen={showCallSettings}
        onClose={() => setShowCallSettings(false)}
      />
      <ChatSettingsDialog
        isOpen={showChatSettings}
        onClose={() => setShowChatSettings(false)}
      />
      <ThemeSettingsDialog
        isOpen={showThemeSettings}
        onClose={() => setShowThemeSettings(false)}
      />
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};
