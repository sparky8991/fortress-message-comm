
import React from 'react';
import { Phone, Video, MoreVertical, Lock, Settings, User, Bell, Shield, LogOut, Info, MessageSquare, Phone as PhoneIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContactInfo {
  name: string;
  status: string;
  avatar: string;
}

interface ChatHeaderProps {
  contact: ContactInfo;
  onStartCall: (type: 'voice' | 'video') => void;
  onShowNotificationSettings: () => void;
  onToggleSidebar?: () => void;
}

export const ChatHeader = ({ contact, onStartCall, onShowNotificationSettings, onToggleSidebar }: ChatHeaderProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
      
      navigate('/auth');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: error.message || "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-3 border-b border-gray-700/80 bg-gray-800/95 backdrop-blur-sm shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Avatar as sidebar toggle on mobile */}
          <button
            onClick={isMobile ? onToggleSidebar : undefined}
            className={`w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-green-500/30 transition-all duration-200 ${
              isMobile 
                ? 'hover:scale-105 active:scale-95 cursor-pointer hover:shadow-green-500/40' 
                : 'cursor-default'
            }`}
            title={isMobile ? "Open sidebar" : undefined}
            aria-label={isMobile ? "Open sidebar" : "Contact avatar"}
          >
            {contact?.avatar}
          </button>
          
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white text-base truncate">{contact?.name}</h2>
            {isMobile ? (
              // Compact mobile layout - just encryption status
              <div className="flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5 text-green-500" />
                <span className="text-xs text-green-500 font-mono">SECURE</span>
              </div>
            ) : (
              // Full desktop layout
              <div className="flex flex-col space-y-1">
                <p className="text-xs text-gray-300 truncate">{contact?.status}</p>
                <div className="flex items-center space-x-1.5">
                  <div className="relative">
                    <Lock className="w-3 h-3 text-green-500 flex-shrink-0 animate-pulse" />
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-xs text-green-500 font-mono font-semibold tracking-wide">End-to-end encrypted</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={() => onStartCall('voice')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Voice Call"
            aria-label="Start voice call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStartCall('video')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
            title="Video Call"
            aria-label="Start video call"
          >
            <Video className="w-4 h-4" />
          </button>
          {!isMobile && (
            <button 
              onClick={onShowNotificationSettings}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
              title="Notification Settings"
              aria-label="Open notification settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          
          {/* Settings Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center hover:scale-105 active:scale-95"
                title="Settings Menu"
                aria-label="Open settings menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-gray-800 border-gray-700 text-white shadow-xl"
              sideOffset={8}
            >
              <DropdownMenuLabel className="text-green-400 font-mono text-xs tracking-wider">
                SETTINGS
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              
              {/* Profile Settings */}
              <DropdownMenuItem 
                onClick={() => navigate('/profile-settings')}
                className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-green-500" />
                <span>Profile Settings</span>
              </DropdownMenuItem>

              {/* Notification Settings - Always show, but different behavior */}
              <DropdownMenuItem 
                onClick={onShowNotificationSettings}
                className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
              >
                <Bell className="mr-2 h-4 w-4 text-blue-500" />
                <span>Notifications</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gray-700" />

              {/* Privacy & Security */}
              <DropdownMenuItem className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer">
                <Shield className="mr-2 h-4 w-4 text-purple-500" />
                <span>Privacy & Security</span>
              </DropdownMenuItem>

              {/* Call Settings */}
              <DropdownMenuItem className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer">
                <PhoneIcon className="mr-2 h-4 w-4 text-orange-500" />
                <span>Call Settings</span>
              </DropdownMenuItem>

              {/* Chat Settings */}
              <DropdownMenuItem className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer">
                <MessageSquare className="mr-2 h-4 w-4 text-cyan-500" />
                <span>Chat Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gray-700" />

              {/* About */}
              <DropdownMenuItem className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer">
                <Info className="mr-2 h-4 w-4 text-gray-400" />
                <span>About SecureChat</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gray-700" />

              {/* Logout */}
              <DropdownMenuItem 
                onClick={handleLogout}
                className="hover:bg-red-900/50 focus:bg-red-900/50 cursor-pointer text-red-400 hover:text-red-300"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
