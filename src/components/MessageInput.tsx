
import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, FileText, X, Shield, Lock, Terminal, ImageIcon, Mic, Copy, Flame } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { GifPicker } from './GifPicker';
import { EncryptedImageUpload } from './EncryptedImageUpload';
import { ReplyPreview } from './ReplyPreview';
import { VoiceRecorder } from './VoiceRecorder';
import { ComposerModeBar } from './tactical';
import { toast } from '@/hooks/use-toast';
import type { TrafficMark } from '@/lib/fortress';
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

      <div className="border-t border-green-500/15 bg-[#06100b]/95 backdrop-blur-sm w-full max-w-full overflow-visible">
        {/* Voice Recorder */}
        {showVoiceRecorder && (
          <div className="p-3 border-b border-green-500/15">
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

        <div className="p-2.5 md:p-3 space-y-2.5 mx-2 md:mx-0">
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

          {attachment && (
            <div className="px-3 py-2 bg-black/90 border border-green-500/40 rounded flex items-center justify-between animate-in fade-in-50 duration-200 min-w-0 shadow-lg shadow-green-500/10">
              <div className="flex items-center space-x-2 overflow-hidden min-w-0 flex-1">
                {isEncryptedFile ? (
                  <div className="p-1 bg-red-500/20 rounded">
                    <Terminal className="w-3 h-3 text-red-400 animate-pulse" />
                  </div>
                ) : (
                  <div className="p-1 bg-gray-600/40 rounded">
                    <FileText className="w-3 h-3 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-white font-medium font-mono block truncate">
                    {isEncryptedFile ? `[ENCRYPTED]: ${encryptionMetadata?.originalName || 'PAYLOAD'}` : `${attachment.name}`}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs text-gray-400 font-mono">
                      {(attachment.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    {isEncryptedFile && typeof encryptionMetadata?.shareCode === 'string' && (
                      <button
                        type="button"
                        onClick={copyEncryptedKey}
                        className="inline-flex items-center gap-1 text-xs text-green-300 hover:text-green-200 font-mono rounded px-1.5 py-0.5 bg-green-500/10 border border-green-500/25"
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
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded transition-all duration-200 flex-shrink-0 ml-2 min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <div className="flex items-end space-x-2 w-full min-w-0">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            
            <div className="flex space-x-1 flex-shrink-0">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2.5 text-green-500/60 hover:text-green-300 hover:bg-green-500/10 rounded border border-green-500/15 transition-all duration-200 flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95 fortress-focus"
                title="Attach File"
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowEncryptedUpload(true)}
                className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded border border-red-500/20 transition-all duration-200 flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95 fortress-focus"
                title="Encrypt Image"
                aria-label="Encrypt and attach image"
              >
                <Lock className="w-4 h-4 animate-pulse" />
              </button>

              <button
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className={`p-2.5 rounded border transition-all duration-200 flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95 fortress-focus ${
                  showVoiceRecorder
                    ? 'bg-green-500/20 text-green-300 border-green-400/60'
                    : 'text-green-400 hover:text-green-300 hover:bg-green-500/10 border-green-500/15'
                }`}
                title="Voice Message"
                aria-label="Record voice message"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 relative min-w-0 mr-2">
              <textarea
                placeholder="Secure message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                className="w-full px-3 py-2.5 bg-black/95 border border-green-500/45 rounded text-green-300 placeholder-green-600/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400/70 pr-10 text-sm font-mono resize-none min-h-[40px] max-h-28 shadow-inner shadow-green-500/10 caret-green-400 transition-all duration-200"
                rows={message.split('\n').length > 1 ? Math.min(message.split('\n').length, 3) : 1}
                style={{ 
                  fontFamily: "'Fira Code', 'Source Code Pro', 'Consolas', 'Monaco', 'Courier New', monospace",
                  letterSpacing: '0.1px',
                  lineHeight: '1.3'
                }}
                aria-label="Message input"
              />
              <div className="absolute right-2.5 top-2.5 flex items-center space-x-1">
                <button
                  onClick={() => {
                    setShowGifPicker(!showGifPicker);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded transition-all duration-200 min-h-[28px] min-w-[28px] flex items-center justify-center"
                  aria-label="Add GIF"
                  title="Send GIF"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowGifPicker(false);
                  }}
                  className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded transition-all duration-200 min-h-[28px] min-w-[28px] flex items-center justify-center"
                  aria-label="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  isOpen={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                />
                <GifPicker
                  isOpen={showGifPicker}
                  onClose={() => setShowGifPicker(false)}
                  onGifSelect={handleGifSelect}
                />
              </div>
            </div>
            
            <button
              onClick={handleSend}
              className="p-2.5 bg-green-500 hover:bg-green-400 rounded text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-green-500/20 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95 mr-2 fortress-focus"
              disabled={!message.trim() && !attachment}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-center pt-1">
            <div className={`flex items-center space-x-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
              burnAfterReadEnabled
                ? 'text-orange-300 bg-orange-500/10 border-orange-500/30'
                : 'text-green-500/80 bg-green-500/10 border-green-500/20'
            }`}>
              {burnAfterReadEnabled ? (
                <Flame className="w-3 h-3 flex-shrink-0 animate-pulse" />
              ) : (
                <Shield className="w-3 h-3 flex-shrink-0 animate-pulse" />
              )}
              <span className="text-center font-medium">
              {burnAfterReadEnabled ? 'BURNS 2 MIN AFTER OPEN' : 'PROTECTED CHANNEL ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
