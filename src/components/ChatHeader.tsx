
import React, { useState } from 'react';
import { Phone, Video, Lock, Settings, ShieldCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatSettingsDialog } from './ChatSettingsDialog';

interface ContactInfo {
  name: string;
  status: string;
  avatar: string;
}

interface ChatHeaderProps {
  contact: ContactInfo;
  onStartCall: (type: 'voice' | 'video') => void;
  onToggleSidebar?: () => void;
}

export const ChatHeader = ({ contact, onStartCall, onToggleSidebar }: ChatHeaderProps) => {
  const isMobile = useIsMobile();
  const [showChatSettings, setShowChatSettings] = useState(false);

  return (
    <>
      <div className="border-b border-green-500/15 bg-[#06100b]/98 backdrop-blur-sm shadow-lg">
        <div className="hidden md:flex h-6 items-center justify-center bg-green-700/70 border-b border-green-400/20">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-green-50">
            Protected Workspace // Secure Team Traffic
          </span>
        </div>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Avatar as sidebar toggle on mobile */}
            <button
              onClick={isMobile ? onToggleSidebar : undefined}
              className={`w-11 h-11 bg-amber-500/10 border border-amber-400/45 rounded flex items-center justify-center text-amber-200 font-mono font-black text-lg flex-shrink-0 transition-all duration-200 fortress-focus ${
                isMobile
                  ? 'hover:bg-amber-500/15 active:scale-95 cursor-pointer'
                  : 'cursor-default'
              }`}
              title={isMobile ? "Open sidebar" : undefined}
              aria-label={isMobile ? "Open sidebar" : "Contact avatar"}
            >
              {contact?.avatar}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-mono font-bold text-white text-base truncate">{contact?.name}</h2>
                <span className="hidden sm:inline-flex rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber-300">
                  Unverified
                </span>
              </div>
              {isMobile ? (
                // Compact mobile layout - just encryption status
                <div className="flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5 text-green-500" />
                  <span className="text-xs text-green-500 font-mono">Protected</span>
                </div>
              ) : (
                // Full desktop layout
                <div className="flex flex-col space-y-0.5">
                  <p className="text-[10px] text-green-500/50 truncate font-mono uppercase tracking-[0.16em]">
                    Channel ready
                  </p>
                  <div className="flex items-center space-x-1.5">
                    <div className="relative">
                      <ShieldCheck className="w-3 h-3 text-green-500 flex-shrink-0 animate-pulse" />
                      <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <span className="text-xs text-green-500 font-mono font-semibold tracking-wide">
                      Protected channel active
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={() => onStartCall('voice')}
              className="p-2 text-green-500/65 hover:text-green-300 hover:bg-green-500/10 rounded border border-transparent hover:border-green-500/25 transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95 fortress-focus"
              title="Voice Call"
              aria-label="Start voice call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStartCall('video')}
              className="p-2 text-green-500/65 hover:text-green-300 hover:bg-green-500/10 rounded border border-transparent hover:border-green-500/25 transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95 fortress-focus"
              title="Video Call"
              aria-label="Start video call"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowChatSettings(true)}
              className="p-2 text-green-500/65 hover:text-green-300 hover:bg-green-500/10 rounded border border-transparent hover:border-green-500/25 transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95 fortress-focus"
              title="Chat Settings"
              aria-label="Open chat settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-between border-t border-green-500/10 bg-amber-950/10 px-4 py-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-400/80">
            [ ! ] Verify identity before passing sensitive traffic
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-green-500/45">
            Session established
          </span>
        </div>
      </div>

      <ChatSettingsDialog
        isOpen={showChatSettings}
        onClose={() => setShowChatSettings(false)}
      />
    </>
  );
};
