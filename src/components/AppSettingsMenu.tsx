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

const menuItemClass =
  'cursor-pointer rounded-sm px-2.5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#DCEAE1] hover:bg-[#36E27B]/10 hover:text-[#36E27B] focus:bg-[#36E27B]/10 focus:text-[#36E27B]';

const menuIconClass = 'mr-2 h-3.5 w-3.5 text-[#76897D]';

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
            <Settings className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 rounded-sm border-[#1C2B22] bg-[#0C120F] p-1 font-mono text-[#DCEAE1] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
          sideOffset={8}
        >
          <DropdownMenuLabel className="px-2.5 py-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#36E27B]">
            Terminal Settings
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#141E18]" />

          <DropdownMenuItem
            onClick={() => openSettings('profile')}
            className={menuItemClass}
          >
            <User className={menuIconClass} />
            <span>Operator Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings('notifications')}
            className={menuItemClass}
          >
            <Bell className={menuIconClass} />
            <span>Notifications</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#141E18]" />

          <DropdownMenuItem
            onClick={() => openSettings('security')}
            className={menuItemClass}
          >
            <Shield className={menuIconClass} />
            <span>Privacy & Security</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings('calls')}
            className={menuItemClass}
          >
            <Phone className={menuIconClass} />
            <span>Call Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings('chat')}
            className={menuItemClass}
          >
            <MessageSquare className={menuIconClass} />
            <span>Chat Behavior</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openSettings('theme')}
            className={menuItemClass}
          >
            <Palette className={menuIconClass} />
            <span>Terminal Theme</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#141E18]" />

          <DropdownMenuItem
            onClick={() => openSettings('about')}
            className={menuItemClass}
          >
            <Info className={menuIconClass} />
            <span>About SecureChat</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#141E18]" />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer rounded-sm px-2.5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#FF6B61] hover:bg-red-500/10 hover:text-[#FF8A82] focus:bg-red-500/10 focus:text-[#FF8A82]"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
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
