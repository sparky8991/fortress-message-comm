
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
    // A small timeout allows the DOM to update before we scroll,
    // ensuring we scroll to the very bottom, especially after an action.
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-green-500" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Encryption Notice */}
      <div className="flex items-center justify-center py-4">
        <div className="bg-black/90 border border-green-500/50 px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg shadow-green-500/20">
          <Lock className="w-4 h-4 text-green-500 animate-pulse" />
          <span className="text-xs text-green-500 font-mono">QUANTUM_ENCRYPTION_PROTOCOL_ACTIVE</span>
        </div>
      </div>

      {/* Messages */}
      {messages.map((message, index) => {
        const showUsername = index === 0 || messages[index - 1].sender !== message.sender;
        
        return (
          <div key={message.id} className="space-y-1">
            {showUsername && (
              <div className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <span className="text-xs text-green-400 px-2 font-mono">
                  [{contactNames[message.sender]}]
                </span>
              </div>
            )}
            
            <div className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <MessageContextMenu
                onReply={onReply}
                messageId={message.id}
                messageText={message.text}
                onSendMessage={onSendMessage}
                onStartNewGroup={onStartNewGroup}
                contactName={contactName}
              >
                <div
                  className={`max-w-[80%] lg:max-w-xl px-4 py-2 rounded-2xl cursor-pointer select-none border ${
                    message.sender === 'me'
                      ? 'bg-black/90 text-green-400 border-green-500/50 shadow-lg shadow-green-500/20'
                      : 'bg-gray-800/90 text-gray-100 border-gray-600/50 shadow-lg'
                  }`}
                  style={{ 
                    fontFamily: "'Fira Code', 'Source Code Pro', 'Consolas', 'Monaco', 'Courier New', monospace",
                    letterSpacing: '0.3px'
                  }}
                >
                  {/* Reply indicator */}
                  {message.replyTo && (
                    <div className="mb-2 p-2 bg-black/40 rounded-lg border-l-2 border-green-400">
                      <p className="text-xs text-green-300 font-medium mb-1 font-mono">
                        > {message.replyTo.sender}
                      </p>
                      <p className="text-xs opacity-80 truncate font-mono">
                        {message.replyTo.messageText}
                      </p>
                    </div>
                  )}
                  
                  {message.attachment && <AttachmentPreview attachment={message.attachment} />}
                  {message.text && <p className="text-sm break-words font-mono leading-relaxed">{message.text}</p>}
                  <div className="flex items-center justify-between mt-1 space-x-2">
                    <div className="flex items-center space-x-1">
                      {message.encrypted && (
                        <Shield className="w-3 h-3 text-green-300 opacity-70 animate-pulse" />
                      )}
                      <span className={`text-xs font-mono ${
                        message.sender === 'me' ? 'text-green-300/80' : 'text-gray-400'
                      }`}>
                        [{message.timestamp}]
                      </span>
                    </div>
                    {message.sender === 'me' && (
                      <div className="flex-shrink-0">
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
      <div ref={messagesEndRef} />
    </div>
  );
};
