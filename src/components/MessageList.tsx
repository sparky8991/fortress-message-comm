import React, { useEffect, useMemo, useRef } from 'react';
import { Shield, Check, CheckCheck, Clock } from 'lucide-react';
import { AttachmentPreview } from './AttachmentPreview';
import { MessageContextMenu } from './MessageContextMenu';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { BurnAfterReadMessage } from './BurnAfterReadMessage';
import { Message } from '@/constants/initialMessages';
import { useIsMobile } from '@/hooks/use-mobile';

// Helper function to detect if a message is a GIF URL
const isGifUrl = (text: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  // Check for common GIF hosting domains and .gif extension
  const gifPatterns = [
    /^https?:\/\/.*\.gif(\?.*)?$/i,
    /^https?:\/\/media\.tenor\.com\//i,
    /^https?:\/\/.*\.giphy\.com\//i,
    /^https?:\/\/tenor\.googleapis\.com\//i
  ];
  return gifPatterns.some(pattern => pattern.test(trimmed));
};

// Helper function to detect if an attachment is a voice message
const isVoiceMessage = (attachment: Message['attachment']): boolean => {
  if (!attachment) return false;
  // Check if metadata indicates voice message
  if (attachment.metadata?.isVoiceMessage) return true;
  // Check if it's an audio file with voice_ prefix in name
  if (attachment.name?.startsWith('voice_') && attachment.type?.startsWith('audio/')) return true;
  return false;
};

interface MessageListProps {
  messages: Message[];
  onReply: (messageId: string, messageText: string) => void;
  onSendMessage: (message: string, attachment: File | null, encryptionMetadata?: Message['metadata']) => void;
  onStartNewGroup?: (contactName: string) => void;
  contactName?: string;
}

export const MessageList = ({ 
  messages, 
  onReply, 
  onSendMessage, 
  onStartNewGroup,
  contactName = 'Alice Johnson'
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const sessionTime = useMemo(() => {
    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(new Date());
    return `${time.replace(/:/g, '')}Z`;
  }, []);

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#76897D] animate-pulse" />;
      case 'sent':
        return <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#76897D]" />;
      case 'delivered':
        return <CheckCheck className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#76897D]" />;
      case 'read':
        return <CheckCheck className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#36E27B]" />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-2 md:px-6 md:py-4">
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-center py-2 md:py-3">
          <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-[#36513F]">
            {isMobile ? '-- SESSION ACTIVE --' : `-- SESSION ESTABLISHED ${sessionTime} - PROTECTED CHANNEL READY --`}
          </div>
        </div>

        {/* Messages */}
        {messages.map((message, index) => {
          const showUsername = index === 0 || messages[index - 1].sender !== message.sender;
          const isConsecutive = index > 0 && messages[index - 1].sender === message.sender;
          const trafficMark = (message.metadata?.trafficMark as string | undefined) || 'normal';
          const markLabel =
            trafficMark === 'locked' ? 'SECRET' :
            trafficMark === 'sensitive' ? 'CONF' :
            'UNCLASS';
          const markClass =
            trafficMark === 'locked'
              ? 'border-[#FF6B61]/50 bg-[#8C1D18]/20 text-[#FF6B61]'
              : trafficMark === 'sensitive'
                ? 'border-[#F2B43C]/50 bg-[#1A1507] text-[#F2B43C]'
                : 'border-[#1E5C3C] bg-[#36E27B]/10 text-[#36E27B]';
          
          return (
            <div key={message.id} className={`space-y-1 ${isConsecutive ? 'mt-1.5' : 'mt-4 md:mt-5'}`}>
              {showUsername && (
                <div className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 px-2.5 py-1 font-mono text-[11px] font-bold text-[#36E27B]">
                      {message.sender === 'me' ? 'You' : contactName}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#76897D]">
                      {message.timestamp}
                    </span>
                  </div>
                </div>
              )}
              
              <div className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'} group`}>
                <MessageContextMenu
                  onReply={onReply}
                  messageId={message.id}
                  messageText={message.text}
                  onSendMessage={onSendMessage}
                  onStartNewGroup={onStartNewGroup}
                  contactName={contactName}
                >
                  <div
                    className={`max-w-[90%] cursor-pointer select-none rounded-sm border px-3 py-2 transition-colors md:max-w-[85%] md:px-4 md:py-3 lg:max-w-xl ${
                      message.sender === 'me'
                        ? 'border-[#1E5C3C] bg-black/95 text-[#36E27B] shadow-[0_0_18px_rgba(54,226,123,0.12)] hover:border-[#36E27B]'
                        : 'border-[#1C2B22] bg-[#101814] text-[#ECF7F0] shadow-lg hover:border-[#36513F]'
                    }`}
                    style={{ letterSpacing: '0.3px' }}
                  >
                    <BurnAfterReadMessage message={message}>
                      {/* Reply indicator */}
                      {message.replyTo && (
                          <div className="mb-2 border-l-2 border-[#36E27B] bg-black/60 p-2 shadow-inner">
                            <p className="mb-1 flex items-center space-x-1 font-mono text-[10px] font-bold text-[#7BEFA9]">
                              <span className="text-[#36E27B]">{'>'}</span>
                              <span>{message.replyTo.sender}</span>
                            </p>
                            <p className="truncate font-mono text-[10px] leading-relaxed opacity-90">
                              {message.replyTo.messageText}
                            </p>
                          </div>
                      )}

                      {message.attachment && (
                        <div className="mb-2 md:mb-3">
                          {isVoiceMessage(message.attachment) ? (
                            <VoiceMessagePlayer
                              audioUrl={message.attachment.url}
                              duration={message.attachment.metadata?.duration || 0}
                              isOwn={message.sender === 'me'}
                            />
                          ) : (
                            <AttachmentPreview attachment={message.attachment} />
                          )}
                        </div>
                      )}

                      {message.text && (
                        isGifUrl(message.text) ? (
                          <div className="overflow-hidden rounded-sm">
                            <img
                              src={message.text}
                              alt="GIF"
                              className="h-auto max-w-full rounded-sm"
                              style={{ maxHeight: '200px' }}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <p className="break-words font-mono text-[12px] leading-relaxed tracking-[0.03em] whitespace-pre-wrap md:text-[13px]">
                            {message.text}
                          </p>
                        )
                      )}

                      <div className="mt-2 flex items-center justify-between border-t border-[#1C2B22]/70 pt-1.5">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-[0.14em] ${markClass}`}>
                            {markLabel}
                          </span>
                          {message.encrypted && (
                            <div className="flex items-center space-x-1 md:space-x-1.5">
                              <Shield className="h-2.5 w-2.5 animate-pulse text-[#36E27B]/80 md:h-3 md:w-3" />
                              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#36E27B]/70">
                                {isMobile ? 'ENC' : 'PROTECTED'}
                              </span>
                            </div>
                          )}
                          {!showUsername && (
                            <span className={`font-mono text-[9px] ${
                              message.sender === 'me' ? 'text-[#36E27B]/60' : 'text-[#76897D]'
                            }`}>
                              {message.timestamp}
                            </span>
                          )}
                        </div>
                        {message.sender === 'me' && (
                          <div className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                            {getStatusIcon(message.status)}
                          </div>
                        )}
                      </div>
                    </BurnAfterReadMessage>
                  </div>
                </MessageContextMenu>
              </div>
              
              {/* Subtle separator for consecutive messages */}
              {isConsecutive && index < messages.length - 1 && messages[index + 1].sender === message.sender && (
                <div className="flex justify-center">
                  <div className="h-1 w-1 rounded-full bg-[#36513F]/40"></div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-8" />
      </div>
    </div>
  );
};
