
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
      <div className="border-b border-[#1C2B22] bg-[#0C120F]/98 backdrop-blur-sm">
        <div className="hidden h-5 items-center justify-center border-b border-[#5C2420] bg-[#8C1D18] md:flex">
          <span className="font-mono text-[8px] font-black uppercase tracking-[0.34em] text-[#FFE0DC]">
            SECRET//NOFORN - CLASSIFIED CHANNEL - AUTHORIZED PERSONNEL ONLY
          </span>
        </div>
        <div className="flex h-16 items-center justify-between px-3 md:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Avatar as sidebar toggle on mobile */}
            <button
              onClick={isMobile ? onToggleSidebar : undefined}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm border border-[#F2B43C]/55 bg-[#F2B43C]/10 font-mono text-sm font-black text-[#FFE0A8] transition-colors fortress-focus ${
                isMobile
                  ? 'hover:bg-[#F2B43C]/15 active:scale-95 cursor-pointer'
                  : 'cursor-default'
              }`}
              title={isMobile ? "Open sidebar" : undefined}
              aria-label={isMobile ? "Open sidebar" : "Contact avatar"}
            >
              {contactInitial}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate font-mono text-sm font-black leading-none tracking-[0.02em] text-[#ECF7F0]">{contact?.name}</h2>
                <span className="hidden rounded-sm border border-[#F2B43C]/45 bg-[#F2B43C]/10 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-[0.18em] text-[#F2B43C] sm:inline-flex">
                  UNVERIFIED
                </span>
              </div>
              {isMobile ? (
                // Compact mobile layout - just encryption status
                <div className="flex items-center space-x-1">
                  <Lock className="h-2.5 w-2.5 text-[#36E27B]" />
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#36E27B]">PROTECTED</span>
                </div>
              ) : (
                // Full desktop layout
                <div className="mt-0.5 flex flex-col space-y-0.5">
                  <p className="truncate font-mono text-[8px] uppercase tracking-[0.22em] text-[#76897D]">
                    CHANNEL READY
                  </p>
                  <div className="flex items-center space-x-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#36E27B]">
                    <Lock className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate">
                      E2E ENCRYPTED - PROTECTED CHANNEL - AES-256-GCM
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => onStartCall('voice')}
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#1C2B22] bg-[#0F1612] text-[#76897D] transition-colors hover:border-[#1E5C3C] hover:bg-[#36E27B]/10 hover:text-[#36E27B] active:scale-95 fortress-focus"
              title="Voice Call"
              aria-label="Start voice call"
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onStartCall('video')}
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#1C2B22] bg-[#0F1612] text-[#76897D] transition-colors hover:border-[#1E5C3C] hover:bg-[#36E27B]/10 hover:text-[#36E27B] active:scale-95 fortress-focus"
              title="Video Call"
              aria-label="Start video call"
            >
              <Video className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowChatSettings(true)}
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#1C2B22] bg-[#0F1612] text-[#76897D] transition-colors hover:border-[#1E5C3C] hover:bg-[#36E27B]/10 hover:text-[#36E27B] active:scale-95 fortress-focus"
              title="Chat Settings"
              aria-label="Open chat settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="hidden items-center justify-between border-t border-[#6B4B18] bg-[#1A1507] px-4 py-1 md:flex">
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-[#F2B43C]">
            [ ! ] VERIFY IDENTITY BEFORE PASSING SENSITIVE TRAFFIC
          </span>
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-[#4A5A50]">
            SESSION ESTABLISHED
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
