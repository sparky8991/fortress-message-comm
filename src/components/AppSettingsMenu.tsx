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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SettingsDialog,
  SettingsProfileSummary,
  SettingsSectionId,
} from './SettingsDialog';

interface AppSettingsMenuProps {
  triggerClassName?: string;
  profile?: SettingsProfileSummary;
  onEditCallSign?: () => void;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Failed to log out. Please try again.';

export const AppSettingsMenu = ({ triggerClassName, profile, onEditCallSign }: AppSettingsMenuProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const [initialSection, setInitialSection] = useState<SettingsSectionId>('profile');

  const currentProfile: SettingsProfileSummary = profile || {
    callSign: 'Operator',
    email: auth.currentUser?.email || '',
    avatarInitials: 'SC',
  };

  const openSettings = (section: SettingsSectionId) => {
    setInitialSection(section);
    setShowSettings(true);
  };

  const handleEditProfile = () => {
    setShowSettings(false);
    navigate('/profile-settings');
  };

  const handleEditCallSign = () => {
    setShowSettings(false);
    onEditCallSign?.();
  };

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
            onClick={() => openSettings('profile')}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <User className="mr-2 h-4 w-4 text-green-500" />
            <span>Operator Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings('notifications')}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Bell className="mr-2 h-4 w-4 text-blue-500" />
            <span>Notifications</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-green-500/15" />

          <DropdownMenuItem
            onClick={() => openSettings('security')}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Shield className="mr-2 h-4 w-4 text-purple-500" />
            <span>Privacy & Security</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings('calls')}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Phone className="mr-2 h-4 w-4 text-orange-500" />
            <span>Call Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings('chat')}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <MessageSquare className="mr-2 h-4 w-4 text-cyan-500" />
            <span>Chat Behavior</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings('theme')}
            className="hover:bg-green-500/10 focus:bg-green-500/10 cursor-pointer"
          >
            <Palette className="mr-2 h-4 w-4 text-pink-500" />
            <span>Terminal Theme</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-green-500/15" />

          <DropdownMenuItem
            onClick={() => openSettings('about')}
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

      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        profile={currentProfile}
        initialSection={initialSection}
        onEditProfile={handleEditProfile}
        onEditCallSign={handleEditCallSign}
      />
    </>
  );
};
