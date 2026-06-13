
import React, { useState } from 'react';
import { Phone, Video, Lock, Settings } from 'lucide-react';
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
  const contactInitial = contact?.avatar || contact?.name?.charAt(0).toUpperCase() || '?';

  return (
    <>
      <div className="border-b border-green-500/15 bg-[#06100b]/98 backdrop-blur-sm">
        <div className="hidden h-5 items-center justify-center border-b border-green-400/20 bg-green-700/75 md:flex">
          <span className="font-mono text-[8px] font-black uppercase tracking-[0.34em] text-green-50">
            Protected Workspace // Secure Team Traffic
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 md:px-4">
          <div className="flex min-w-0 flex-1 items-center space-x-3">
            {/* Avatar as sidebar toggle on mobile */}
            <button
              onClick={isMobile ? onToggleSidebar : undefined}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border border-amber-400/55 bg-amber-500/10 font-mono text-sm font-black text-amber-200 transition-all duration-200 fortress-focus ${
                isMobile
                  ? 'hover:bg-amber-500/15 active:scale-95 cursor-pointer'
                  : 'cursor-default'
              }`}
              title={isMobile ? "Open sidebar" : undefined}
              aria-label={isMobile ? "Open sidebar" : "Contact avatar"}
            >
              {contactInitial}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate font-mono text-[15px] font-black leading-tight text-white">{contact?.name}</h2>
                <span className="hidden rounded-sm border border-amber-400/45 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-amber-300 sm:inline-flex">
                  Unverified
                </span>
              </div>
              {isMobile ? (
                // Compact mobile layout - just encryption status
                <div className="flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5 text-green-500" />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-green-500">Protected</span>
                </div>
              ) : (
                // Full desktop layout
                <div className="mt-0.5 flex flex-col space-y-0.5">
                  <p className="truncate font-mono text-[8px] uppercase tracking-[0.22em] text-green-500/45">
                    Channel ready
                  </p>
                  <div className="flex items-center space-x-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-green-400">
                    <Lock className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate">
                      E2E encrypted - AES-256-GCM
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center space-x-2">
            <button
              onClick={() => onStartCall('voice')}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-green-500/20 bg-[#07110c] text-green-500/70 transition-all duration-200 hover:border-green-500/45 hover:bg-green-500/10 hover:text-green-300 active:scale-95 fortress-focus md:h-9 md:w-9"
              title="Voice Call"
              aria-label="Start voice call"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onStartCall('video')}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-green-500/20 bg-[#07110c] text-green-500/70 transition-all duration-200 hover:border-green-500/45 hover:bg-green-500/10 hover:text-green-300 active:scale-95 fortress-focus md:h-9 md:w-9"
              title="Video Call"
              aria-label="Start video call"
            >
              <Video className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowChatSettings(true)}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-green-500/20 bg-[#07110c] text-green-500/70 transition-all duration-200 hover:border-green-500/45 hover:bg-green-500/10 hover:text-green-300 active:scale-95 fortress-focus md:h-9 md:w-9"
              title="Chat Settings"
              aria-label="Open chat settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="hidden items-center justify-between border-t border-amber-400/15 bg-amber-950/10 px-4 py-1 md:flex">
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-amber-400/80">
            [ ! ] Verify identity before passing sensitive traffic
          </span>
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-green-500/45">
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
