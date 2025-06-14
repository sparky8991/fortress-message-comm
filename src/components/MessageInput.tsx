
import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, FileText, X, Shield } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { toast } from '@/hooks/use-toast';

interface MessageInputProps {
  onSendMessage: (message: string, attachment: File | null) => void;
}

export const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const BANNED_EXTENSIONS = ['exe', 'msi', 'bat', 'cmd', 'sh', 'js', 'jsx', 'ts', 'tsx', 'ps1', 'vbs', 'html', 'css', 'php'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && BANNED_EXTENSIONS.includes(fileExtension)) {
      toast({ title: 'File type not allowed', description: 'For security reasons, script files cannot be attached.', variant: 'destructive'});
      return;
    }

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File is too large', description: 'Please select a file smaller than 25MB.', variant: 'destructive'});
      return;
    }
    
    setAttachment(file);
    event.target.value = ''; // Reset file input
  };

  const handleSend = () => {
    if (!message.trim() && !attachment) return;
    onSendMessage(message.trim(), attachment);
    setMessage('');
    setAttachment(null);
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  return (
    <div className="p-4 border-t border-gray-700 bg-gray-800">
      {attachment && (
        <div className="mb-2 px-2 py-1 bg-gray-700/80 rounded-lg flex items-center justify-between animate-in fade-in-50">
          <div className="flex items-center space-x-2 overflow-hidden">
            <FileText className="w-5 h-5 text-gray-300 flex-shrink-0" />
            <span className="text-sm text-white truncate">{attachment.name}</span>
          </div>
          <button onClick={() => setAttachment(null)} className="p-1 text-gray-300 hover:text-white rounded-full hover:bg-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex items-center space-x-2">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
          <Paperclip className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Type an encrypted message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-gray-300 hover:text-white transition-colors"
            >
              <Smile className="w-5 h-5" />
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
          className="p-3 bg-green-500 hover:bg-green-600 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!message.trim() && !attachment}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex items-center justify-center mt-2">
        <div className="flex items-center space-x-1 text-xs text-green-500">
          <Shield className="w-3 h-3" />
          <span>Messages are secured with military-grade encryption</span>
        </div>
      </div>
    </div>
  );
};
