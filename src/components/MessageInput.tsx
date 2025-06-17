
import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, FileText, X, Shield, Lock, Terminal } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { EncryptedImageUpload } from './EncryptedImageUpload';
import { ReplyPreview } from './ReplyPreview';
import { toast } from '@/hooks/use-toast';

interface MessageInputProps {
  onSendMessage: (message: string, attachment: File | null, encryptionMetadata?: any, replyTo?: any) => void;
  replyingTo?: {
    messageId: string;
    messageText: string;
    sender: string;
  } | null;
  onCancelReply?: () => void;
}

export const MessageInput = ({ onSendMessage, replyingTo, onCancelReply }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [encryptionMetadata, setEncryptionMetadata] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEncryptedUpload, setShowEncryptedUpload] = useState(false);
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

  const handleEncryptedImageReady = (encryptedFile: File, metadata: any) => {
    setAttachment(encryptedFile);
    setEncryptionMetadata(metadata);
    setShowEncryptedUpload(false);
    
    const shareMessage = `🔒 ENCRYPTED PAYLOAD DEPLOYED\n\nDecryption Key: ${metadata.shareCode}\n\n⚠️ CLASSIFIED - Share key securely with authorized personnel only`;
    setMessage(shareMessage);
  };

  const handleSend = () => {
    if (!message.trim() && !attachment) return;
    onSendMessage(message.trim(), attachment, encryptionMetadata, replyingTo);
    setMessage('');
    setAttachment(null);
    setEncryptionMetadata(null);
    setShowEmojiPicker(false);
    if (onCancelReply) onCancelReply();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const isEncryptedFile = attachment?.name.includes('encrypted_') && attachment?.name.endsWith('.enc');

  return (
    <>
      {showEncryptedUpload && (
        <EncryptedImageUpload
          onEncryptedImageReady={handleEncryptedImageReady}
          onCancel={() => setShowEncryptedUpload(false)}
        />
      )}

      <div className="border-t border-gray-700/80 bg-gray-800/95 backdrop-blur-sm w-full max-w-full overflow-hidden">
        <ReplyPreview 
          replyingTo={replyingTo} 
          onCancelReply={onCancelReply || (() => {})} 
        />

        <div className="p-4 md:p-6 space-y-4">
          {attachment && (
            <div className="px-4 py-3 bg-black/90 border border-green-500/40 rounded-xl flex items-center justify-between animate-in fade-in-50 duration-200 min-w-0 shadow-lg shadow-green-500/10">
              <div className="flex items-center space-x-3 overflow-hidden min-w-0 flex-1">
                {isEncryptedFile ? (
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Terminal className="w-4 h-4 text-red-400 animate-pulse" />
                  </div>
                ) : (
                  <div className="p-2 bg-gray-600/40 rounded-lg">
                    <FileText className="w-4 h-4 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-white font-medium font-mono block truncate">
                    {isEncryptedFile ? `[ENCRYPTED]: ${encryptionMetadata?.originalName || 'PAYLOAD'}` : `${attachment.name}`}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {(attachment.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setAttachment(null);
                  setEncryptionMetadata(null);
                  setMessage('');
                }} 
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded-lg transition-all duration-200 flex-shrink-0 ml-3"
                aria-label="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-end space-x-3 w-full">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            
            <div className="flex space-x-2">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-3 text-gray-300 hover:text-white hover:bg-gray-700/80 rounded-xl transition-all duration-200 flex-shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center hover:scale-105 active:scale-95"
                title="Attach File"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => setShowEncryptedUpload(true)} 
                className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-all duration-200 flex-shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center hover:scale-105 active:scale-95"
                title="Encrypt Image"
                aria-label="Encrypt and attach image"
              >
                <Lock className="w-5 h-5 animate-pulse" />
              </button>
            </div>
            
            <div className="flex-1 relative min-w-0">
              <textarea
                placeholder="> ENTER_ENCRYPTED_TRANSMISSION..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                className="w-full px-4 py-3 bg-black/95 border border-green-500/60 rounded-xl text-green-400 placeholder-green-600/60 focus:outline-none focus:ring-2 focus:ring-green-500/80 focus:border-green-400/80 pr-12 text-sm font-mono resize-none min-h-[48px] max-h-32 shadow-inner shadow-green-500/10 caret-green-400 transition-all duration-200"
                rows={message.split('\n').length > 1 ? Math.min(message.split('\n').length, 4) : 1}
                style={{ 
                  fontFamily: "'Fira Code', 'Source Code Pro', 'Consolas', 'Monaco', 'Courier New', monospace",
                  letterSpacing: '0.3px',
                  lineHeight: '1.5'
                }}
                aria-label="Message input"
              />
              <div className="absolute right-3 top-3">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg transition-all duration-200"
                  aria-label="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  isOpen={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            </div>
            
            <button
              onClick={handleSend}
              className="p-3 bg-green-500 hover:bg-green-600 rounded-xl text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-green-500/30 min-h-[48px] min-w-[48px] flex items-center justify-center hover:scale-105 active:scale-95 disabled:hover:scale-100"
              disabled={!message.trim() && !attachment}
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center justify-center pt-2">
            <div className="flex items-center space-x-2 text-xs text-green-500/80 font-mono bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
              <Shield className="w-3 h-3 flex-shrink-0 animate-pulse" />
              <span className="text-center">QUANTUM_ENCRYPTED_CHANNEL_ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
