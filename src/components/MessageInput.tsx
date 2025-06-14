
import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, FileText, X, Shield, Lock, Terminal } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { EncryptedImageUpload } from './EncryptedImageUpload';
import { toast } from '@/hooks/use-toast';

interface MessageInputProps {
  onSendMessage: (message: string, attachment: File | null, encryptionMetadata?: any) => void;
}

export const MessageInput = ({ onSendMessage }: MessageInputProps) => {
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
  };

  const handleSend = () => {
    if (!message.trim() && !attachment) return;
    onSendMessage(message.trim(), attachment, encryptionMetadata);
    setMessage('');
    setAttachment(null);
    setEncryptionMetadata(null);
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const isEncryptedFile = attachment?.name.includes('encrypted_') && attachment?.name.endsWith('.enc');

  if (showEncryptedUpload) {
    return (
      <div className="p-3 sm:p-4 border-t border-red-500/30 bg-black/50">
        <EncryptedImageUpload
          onEncryptedImageReady={handleEncryptedImageReady}
          onCancel={() => setShowEncryptedUpload(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 border-t border-gray-700 bg-gray-800">
      {attachment && (
        <div className="mb-2 px-2 py-1 bg-black/80 border border-green-500/30 rounded-lg flex items-center justify-between animate-in fade-in-50">
          <div className="flex items-center space-x-2 overflow-hidden">
            {isEncryptedFile ? (
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 animate-pulse" />
            ) : (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 flex-shrink-0" />
            )}
            <span className="text-xs sm:text-sm text-white truncate font-mono">
              {isEncryptedFile ? `[ENCRYPTED]: ${encryptionMetadata?.originalName || 'PAYLOAD'}` : `[FILE]: ${attachment.name}`}
            </span>
          </div>
          <button 
            onClick={() => {
              setAttachment(null);
              setEncryptionMetadata(null);
            }} 
            className="p-1 text-gray-300 hover:text-white rounded-full hover:bg-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          title="Attach File"
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        
        <button 
          onClick={() => setShowEncryptedUpload(true)} 
          className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 animate-pulse"
          title="Encrypt Image"
        >
          <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Enter encrypted transmission..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10 sm:pr-12 text-sm sm:text-base font-mono"
          />
          <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-gray-300 hover:text-white transition-colors"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
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
          className="p-2 sm:p-3 bg-green-500 hover:bg-green-600 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          disabled={!message.trim() && !attachment}
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
      
      <div className="flex items-center justify-center mt-2">
        <div className="flex items-center space-x-1 text-xs text-green-500 font-mono">
          <Shield className="w-3 h-3" />
          <span className="hidden sm:inline">Deep web secured with military-grade encryption</span>
          <span className="sm:hidden">Deep web secured</span>
        </div>
      </div>
    </div>
  );
};
