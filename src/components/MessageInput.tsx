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
    
    // Auto-populate message with share instructions
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
      {/* Encrypted Upload Overlay */}
      {showEncryptedUpload && (
        <EncryptedImageUpload
          onEncryptedImageReady={handleEncryptedImageReady}
          onCancel={() => setShowEncryptedUpload(false)}
        />
      )}

      <div className="border-t border-gray-700 bg-gray-800 w-full max-w-full overflow-hidden">
        {/* Reply Preview */}
        <ReplyPreview 
          replyingTo={replyingTo} 
          onCancelReply={onCancelReply || (() => {})} 
        />

        <div className="p-3">
          {attachment && (
            <div className="mb-2 px-2 py-1 bg-black/80 border border-green-500/30 rounded-lg flex items-center justify-between animate-in fade-in-50 min-w-0">
              <div className="flex items-center space-x-2 overflow-hidden min-w-0 flex-1">
                {isEncryptedFile ? (
                  <Terminal className="w-4 h-4 text-red-500 flex-shrink-0 animate-pulse" />
                ) : (
                  <FileText className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
                <span className="text-xs text-white truncate font-mono min-w-0">
                  {isEncryptedFile ? `[ENCRYPTED]: ${encryptionMetadata?.originalName || 'PAYLOAD'}` : `[FILE]: ${attachment.name}`}
                </span>
              </div>
              <button 
                onClick={() => {
                  setAttachment(null);
                  setEncryptionMetadata(null);
                  setMessage(''); // Clear auto-generated message when removing encrypted file
                }} 
                className="p-1 text-gray-300 hover:text-white rounded-full hover:bg-gray-600 transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-center space-x-2 w-full">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setShowEncryptedUpload(true)} 
              className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 animate-pulse"
              title="Encrypt Image"
            >
              <Lock className="w-4 h-4" />
            </button>
            
            <div className="flex-1 relative min-w-0">
              <textarea
                placeholder="Enter encrypted transmission..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10 text-sm font-mono resize-none min-h-[40px] max-h-24"
                rows={message.split('\n').length > 1 ? Math.min(message.split('\n').length, 3) : 1}
              />
              <div className="absolute right-2 top-2">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-gray-300 hover:text-white transition-colors"
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
              className="p-2 bg-green-500 hover:bg-green-600 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              disabled={!message.trim() && !attachment}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-center mt-2">
            <div className="flex items-center space-x-1 text-xs text-green-500 font-mono">
              <Shield className="w-3 h-3 flex-shrink-0" />
              <span className="text-center">Deep web secured with military-grade encryption</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
