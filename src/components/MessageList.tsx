
import React, { useEffect, useRef } from 'react';
import { Shield, Lock, Check, CheckCheck, Clock } from 'lucide-react';
import { AttachmentPreview } from './AttachmentPreview';
import { MessageContextMenu } from './MessageContextMenu';
import { Message } from '@/constants/initialMessages';
import { contactNames } from '@/constants/contactInfo';

interface MessageListProps {
  messages: Message[];
  onReply: (messageId: string, messageText: string) => void;
  onSendMessage: (message: string, attachment: File | null, encryptionMetadata?: any) => void;
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
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-green-500" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 max-w-5xl mx-auto w-full">
      <div className="space-y-4">
        {/* Enhanced Encryption Notice */}
        <div className="flex items-center justify-center py-6">
          <div className="bg-black/95 border border-green-500/60 px-4 py-2 rounded-xl flex items-center space-x-2 shadow-2xl shadow-green-500/20 backdrop-blur-sm">
            <div className="relative">
              <Lock className="w-4 h-4 text-green-500 animate-pulse" />
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
            </div>
            <span className="text-xs text-green-500 font-mono font-medium tracking-wide">
              ENCRYPTED_CHANNEL
            </span>
          </div>
        </div>

        {/* Messages */}
        {messages.map((message, index) => {
          const showUsername = index === 0 || messages[index - 1].sender !== message.sender;
          const isConsecutive = index > 0 && messages[index - 1].sender === message.sender;
          
          return (
            <div key={message.id} className={`space-y-1.5 ${isConsecutive ? 'mt-1' : 'mt-4'}`}>
              {showUsername && (
                <div className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-green-400/80 px-2 py-0.5 bg-green-500/10 rounded-full font-mono border border-green-500/20">
                      {contactNames[message.sender]}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
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
                    className={`max-w-[85%] sm:max-w-[75%] lg:max-w-xl px-3 py-2.5 rounded-xl cursor-pointer select-none border transition-all duration-200 hover:scale-[1.01] ${
                      message.sender === 'me'
                        ? 'bg-black/95 text-green-400 border-green-500/60 shadow-lg shadow-green-500/20 hover:shadow-green-500/30'
                        : 'bg-gray-800/95 text-gray-100 border-gray-600/60 shadow-lg hover:shadow-lg'
                    }`}
                    style={{ 
                      fontFamily: "'Fira Code', 'Source Code Pro', 'Consolas', 'Monaco', 'Courier New', monospace",
                      letterSpacing: '0.3px'
                    }}
                  >
                    {/* Reply indicator */}
                    {message.replyTo && (
                      <div className="mb-2 p-2 bg-black/60 rounded-lg border-l-2 border-green-400 shadow-inner">
                        <p className="text-xs text-green-300 font-semibold mb-1 font-mono flex items-center space-x-1">
                          <span className="text-green-500">{'>'}</span>
                          <span>{message.replyTo.sender}</span>
                        </p>
                        <p className="text-xs opacity-90 truncate font-mono leading-relaxed">
                          {message.replyTo.messageText}
                        </p>
                      </div>
                    )}
                    
                    {message.attachment && (
                      <div className="mb-2">
                        <AttachmentPreview attachment={message.attachment} />
                      </div>
                    )}
                    
                    {message.text && (
                      <p className="text-sm break-words font-mono leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-700/40">
                      <div className="flex items-center space-x-2">
                        {message.encrypted && (
                          <div className="flex items-center space-x-1">
                            <Shield className="w-2.5 h-2.5 text-green-300/70 animate-pulse" />
                            <span className="text-xs text-green-300/60 font-mono">ENCRYPTED</span>
                          </div>
                        )}
                        {!showUsername && (
                          <span className={`text-xs font-mono ${
                            message.sender === 'me' ? 'text-green-300/60' : 'text-gray-500'
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
                  </div>
                </MessageContextMenu>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-2" />
      </div>
    </div>
  );
};
