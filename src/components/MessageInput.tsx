
import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, FileText, X, Shield, Terminal, Mic, Copy, Flame } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { GifPicker } from './GifPicker';
import { EncryptedImageUpload } from './EncryptedImageUpload';
import { ReplyPreview } from './ReplyPreview';
import { VoiceRecorder } from './VoiceRecorder';
import { ComposerModeBar } from './tactical';
import { toast } from '@/hooks/use-toast';
import { MARK_META, type TrafficMark } from '@/lib/fortress';
import { buildEncryptedPayloadMessage, stripEncryptedPayloadSecrets } from '@/utils/encryptedPayloadMessage';
import { BURN_AFTER_READ_SECONDS } from '@/utils/burnAfterRead.js';

type ReplyingTo = {
  messageId: string;
  messageText: string;
  sender: string;
};

type MessageMetadata = Record<string, unknown> & {
  duration?: number;
  isVoiceMessage?: boolean;
  mimeType?: string;
  originalName?: string;
  shareCode?: string;
  burnAfterRead?: boolean;
  burnAfterReadSeconds?: number;
  burnOpenedAt?: null;
  burnExpiresAt?: null;
  burnOpenedBy?: null;
  trafficMark?: TrafficMark;
};

interface MessageInputProps {
  onSendMessage: (message: string, attachment: File | null, encryptionMetadata?: MessageMetadata | null, replyTo?: ReplyingTo | null) => void | Promise<void>;
  replyingTo?: ReplyingTo | null;
  onCancelReply?: () => void;
}

export const MessageInput = ({ onSendMessage, replyingTo, onCancelReply }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [encryptionMetadata, setEncryptionMetadata] = useState<MessageMetadata | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEncryptedUpload, setShowEncryptedUpload] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [burnAfterReadEnabled, setBurnAfterReadEnabled] = useState(false);
  const [messageMark, setMessageMark] = useState<TrafficMark>('normal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionButtonClass = "fortress-focus grid h-[38px] w-[38px] flex-none place-items-center rounded border border-[#1C2B22] bg-transparent text-[#76897D] transition-colors hover:border-[#1E5C3C] hover:text-[#36E27B] active:scale-95";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const BANNED_EXTENSIONS = ['exe', 'msi', 'bat', 'cmd', 'sh', 'js', 'jsx', 'ts', 'tsx', 'ps1', 'vbs', 'html', 'css', 'php'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && BANNED_EXTENSIONS.includes(fileExtension)) {
      toast({ 
        title: '🚫 MALICIOUS FILE DETECTED', 
        description: 'Executable files blocked by security protocols.', 
        variant: 'destructive'
      });
      return;
    }

    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast({ 
        title: '⚠️ PAYLOAD TOO LARGE', 
        description: 'File exceeds 25MB transmission limit.', 
        variant: 'destructive'
      });
      return;
    }
    
    setAttachment(file);
    event.target.value = '';
    
    toast({
      title: '📎 FILE ATTACHED',
      description: 'Payload ready for secure transmission.',
    });
  };

  const handleEncryptedImageReady = (encryptedFile: File, metadata: MessageMetadata) => {
    setAttachment(encryptedFile);
    setEncryptionMetadata(metadata);
    setShowEncryptedUpload(false);
    setMessageMark('locked');
    setMessage(buildEncryptedPayloadMessage(metadata));
  };

  const copyEncryptedKey = async () => {
    const shareCode = encryptionMetadata?.shareCode;
    if (typeof shareCode !== 'string' || !shareCode) return;

    try {
      await navigator.clipboard.writeText(shareCode);
      toast({
        title: 'DECRYPTION KEY COPIED',
        description: 'Share this key separately from the encrypted payload.',
      });
    } catch (error) {
      console.error('Failed to copy decryption key:', error);
      toast({
        title: 'COPY FAILED',
        description: 'Select and copy the key manually before sending.',
        variant: 'destructive'
      });
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !attachment) return;
    try {
      const outgoingMark = encryptionMetadata ? 'locked' : messageMark;
      const safeMetadata = stripEncryptedPayloadSecrets(encryptionMetadata) as MessageMetadata | null;
      const markedMetadata: MessageMetadata | null =
        safeMetadata || outgoingMark !== 'normal'
          ? {
              ...(safeMetadata || {}),
              trafficMark: outgoingMark,
            }
          : null;
      const metadataForSend: MessageMetadata | null = burnAfterReadEnabled
        ? {
            ...(markedMetadata || {}),
            burnAfterRead: true,
            burnAfterReadSeconds: BURN_AFTER_READ_SECONDS,
            burnOpenedAt: null,
            burnExpiresAt: null,
            burnOpenedBy: null,
          }
        : markedMetadata;
      await onSendMessage(message.trim(), attachment, metadataForSend, replyingTo);
      setMessage('');
      setAttachment(null);
      setEncryptionMetadata(null);
      setBurnAfterReadEnabled(false);
      setMessageMark('normal');
      setShowEmojiPicker(false);
      setShowGifPicker(false);
      if (onCancelReply) onCancelReply();
    } catch (error) {
      console.error('Send failed:', error);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleGifSelect = (gifUrl: string) => {
    // Send GIF immediately as a message
    Promise.resolve(onSendMessage(gifUrl, null, null, replyingTo))
      .then(() => {
        setShowGifPicker(false);
        if (onCancelReply) onCancelReply();
      })
      .catch((error) => console.error('GIF send failed:', error));
  };

  const handleVoiceSend = (audioBlob: Blob, duration: number) => {
    // Convert blob to file with voice message metadata
    const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
      type: audioBlob.type
    });

    // Send with voice metadata
    onSendMessage('', audioFile, {
      isVoiceMessage: true,
      duration,
      mimeType: audioBlob.type
    }, replyingTo);

    setShowVoiceRecorder(false);
    if (onCancelReply) onCancelReply();

    toast({
      title: '🎙️ VOICE TRANSMISSION SENT',
      description: `${duration}s audio message encrypted and delivered.`,
    });
  };

  const isEncryptedFile = attachment?.name.includes('encrypted_') && attachment?.name.endsWith('.enc');
  const outboundMark = encryptionMetadata ? 'locked' : messageMark;

  return (
    <>
      {showEncryptedUpload && (
        <EncryptedImageUpload
          onEncryptedImageReady={handleEncryptedImageReady}
          onCancel={() => {
            setShowEncryptedUpload(false);
            if (!encryptionMetadata) {
              setMessageMark('normal');
            }
          }}
        />
      )}

      <div className="w-full max-w-full overflow-visible border-t border-[#1C2B22] bg-[#0C120F]">
        {/* Voice Recorder */}
        {showVoiceRecorder && (
          <div className="border-b border-[#141E18] p-3">
            <VoiceRecorder
              onSend={handleVoiceSend}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        )}
        <ReplyPreview 
          replyingTo={replyingTo} 
          onCancelReply={onCancelReply || (() => {})} 
        />

        <div className="px-4 pb-2 pt-2.5">
          <div className="mb-2 flex items-center justify-between gap-2 overflow-x-auto">
            <ComposerModeBar
              messageMark={messageMark}
              onSelectMark={setMessageMark}
              onLockedSelect={() => {
                setMessageMark('locked');
                setShowEncryptedUpload(true);
              }}
              burnEnabled={burnAfterReadEnabled}
              onToggleBurn={() => setBurnAfterReadEnabled((enabled) => !enabled)}
            />
            <span className="hidden flex-none font-mono text-[10px] uppercase tracking-[1px] text-[#4A5A50] lg:inline">
              OUTBOUND MARKED {MARK_META[outboundMark].label}
            </span>
          </div>

          {attachment && (
            <div className="flex min-w-0 animate-in items-center justify-between rounded-sm border border-[#1E5C3C] bg-black/90 px-3 py-2 shadow-[0_0_18px_rgba(54,226,123,0.12)] duration-200 fade-in-50">
              <div className="flex items-center space-x-2 overflow-hidden min-w-0 flex-1">
                {isEncryptedFile ? (
                  <div className="rounded-sm bg-[#8C1D18]/25 p-1">
                    <Terminal className="h-3 w-3 animate-pulse text-[#FF6B61]" />
                  </div>
                ) : (
                  <div className="rounded-sm bg-[#1C2B22] p-1">
                    <FileText className="h-3 w-3 text-[#DCEAE1]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[12px] font-black text-[#ECF7F0]">
                    {isEncryptedFile ? `[ENCRYPTED]: ${encryptionMetadata?.originalName || 'PAYLOAD'}` : `${attachment.name}`}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[10px] text-[#76897D]">
                      {(attachment.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    {isEncryptedFile && typeof encryptionMetadata?.shareCode === 'string' && (
                      <button
                        type="button"
                        onClick={copyEncryptedKey}
                        className="inline-flex items-center gap-1 rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#7BEFA9] hover:text-[#ECF7F0]"
                      >
                        <Copy className="w-3 h-3" />
                        Copy decryption key
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setAttachment(null);
                  setEncryptionMetadata(null);
                  setMessageMark('normal');
                  setMessage('');
                }} 
                className="ml-2 flex min-h-8 min-w-8 flex-shrink-0 items-center justify-center rounded-sm p-1.5 text-[#76897D] transition-colors hover:bg-[#101814] hover:text-[#ECF7F0]"
                aria-label="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <div className="flex w-full min-w-0 items-stretch gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            
            <div className="flex flex-none gap-2">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className={actionButtonClass}
                title="Attach File"
                aria-label="Attach file"
              >
                <Paperclip className="h-[15px] w-[15px]" />
              </button>

              <button
                type="button"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className={`${actionButtonClass} ${
                  showVoiceRecorder
                    ? 'border-[#36E27B] bg-[#36E27B]/15 text-[#ECF7F0]'
                    : ''
                }`}
                title="Voice Message"
                aria-label="Record voice message"
              >
                <Mic className="h-[15px] w-[15px]" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowGifPicker(false);
                  }}
                  className={actionButtonClass}
                  aria-label="Add emoji"
                  title="Add emoji"
                >
                  <Smile className="h-[15px] w-[15px]" />
                </button>
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  isOpen={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowGifPicker(!showGifPicker);
                    setShowEmojiPicker(false);
                  }}
                  className={`${actionButtonClass} font-mono text-[10px] font-extrabold uppercase tracking-[1px]`}
                  aria-label="Add GIF"
                  title="Send GIF"
                >
                  GIF
                </button>
                <GifPicker
                  isOpen={showGifPicker}
                  onClose={() => setShowGifPicker(false)}
                  onGifSelect={handleGifSelect}
                />
              </div>
            </div>
            
            <div className="relative min-w-0 flex-1">
              <textarea
                placeholder="SECURE MESSAGE..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                className="h-[38px] min-h-[38px] max-h-28 w-full resize-none scrollbar-hide rounded border border-[#1C2B22] bg-[#0F1612] px-3 py-[10px] font-mono text-[13px] text-[#DCEAE1] shadow-[inset_0_1px_8px_rgba(54,226,123,0.06)] caret-[#36E27B] transition-colors placeholder:text-[#76897D]/60 focus:border-[#1E5C3C] focus:outline-none focus:ring-1 focus:ring-[#36E27B]/25"
                rows={message.split('\n').length > 1 ? Math.min(message.split('\n').length, 3) : 1}
                style={{
                  letterSpacing: '0.5px',
                  lineHeight: '1.15'
                }}
                aria-label="Message input"
              />
            </div>

            <button
              type="button"
              onClick={handleSend}
              className="fortress-focus grid h-[38px] w-[42px] flex-none place-items-center rounded bg-[#36E27B] text-[#06130B] shadow-[0_0_18px_rgba(54,226,123,0.18)] transition-colors hover:bg-[#7BEFA9] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!message.trim() && !attachment}
              aria-label="Send message"
            >
              <Send className="h-[15px] w-[15px]" />
            </button>
          </div>
          
          <div className="mt-[7px] flex items-center justify-center">
            <div className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[2px] ${
              burnAfterReadEnabled
                ? 'text-[#F2B43C]'
                : 'text-[#4A5A50]'
            }`}>
              {burnAfterReadEnabled ? (
                <Flame className="w-3 h-3 flex-shrink-0" />
              ) : (
                <Shield className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="text-center font-medium">
                {burnAfterReadEnabled
                  ? 'BURN ARMED - DELETES 2 MIN AFTER OPEN'
                  : 'END-TO-END ENCRYPTED - KEYS HELD ON DEVICE ONLY - NO SERVER COPIES'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
