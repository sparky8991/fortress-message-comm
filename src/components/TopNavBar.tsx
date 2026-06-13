import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, LogOut, Settings, Menu, Bell, AlertTriangle } from 'lucide-react';
import { auth } from '@/integrations/firebase/client';
import { signOut } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from '@/hooks/use-mobile';

interface TopNavBarProps {
  onToggleSidebar?: () => void;
  showMenuButton?: boolean;
  callSign?: string;
}

export const TopNavBar = ({ onToggleSidebar, showMenuButton = false, callSign }: TopNavBarProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="flex items-center justify-between px-3 py-2.5 md:px-4 md:py-3">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {showMenuButton && (
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Shield className="w-6 h-6 text-green-500" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="ft-body font-bold text-white leading-tight">SecureChat</span>
              <span className="text-[10px] text-gray-500 font-mono leading-tight hidden sm:block">FORTRESS</span>
            </div>
          </div>
        </div>

        {/* Center - Security Status (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
          <Lock className="w-3.5 h-3.5 text-green-400" />
          <span className="ft-meta text-green-400 font-medium tracking-wide">ENCRYPTED</span>
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Mobile encryption indicator */}
          <div className="flex md:hidden items-center gap-1 px-2 py-1 rounded-full bg-green-500/10">
            <Lock className="w-3 h-3 text-green-400" />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          </div>

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-black" />
                </div>
                {callSign && !isMobile && (
                  <span className="ft-body text-gray-300 max-w-[100px] truncate">{callSign}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white w-56">
              {callSign && (
                <>
                  <div className="px-3 py-2 border-b border-gray-700">
                    <p className="ft-meta text-gray-400">Signed in as</p>
                    <p className="ft-body font-medium text-white truncate">{callSign}</p>
                  </div>
                </>
              )}
              <DropdownMenuItem
                onSelect={() => navigate('/profile-settings')}
                className="cursor-pointer focus:bg-gray-700 focus:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                onSelect={handleLogout}
                className="cursor-pointer text-red-400 focus:bg-red-600/30 focus:text-red-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
