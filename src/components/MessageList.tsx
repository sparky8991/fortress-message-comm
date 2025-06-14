import React, { useEffect, useRef } from 'react';
import { Shield, Lock, Check, CheckCheck, Clock } from 'lucide-react';
import { AttachmentPreview } from './AttachmentPreview';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'me' | 'contact';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  encrypted: boolean;
  attachment?: {
    name: string;
    url: string;
    type: string;
    metadata?: {
      salt: string;
      iv: string;
      originalName: string;
    };
  };
}

interface MessageListProps {
  messages: Message[];
}

const contactNames = {
  'me': 'You',
  'contact': 'Alice Johnson' // This would be dynamic based on the active chat
};

export const MessageList = ({ messages }: MessageListProps) => {
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
        <div className="bg-gray-800 px-4 py-2 rounded-full flex items-center space-x-2">
          <Lock className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-500">End-to-end encrypted conversation</span>
        </div>
      </div>

      {/* Messages */}
      {messages.map((message, index) => {
        const showUsername = index === 0 || messages[index - 1].sender !== message.sender;
        
        return (
          <div key={message.id} className="space-y-1">
            {showUsername && (
              <div className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <span className="text-xs text-gray-400 px-2">
                  {contactNames[message.sender]}
                </span>
              </div>
            )}
            
            <div className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] lg:max-w-xl px-4 py-2 rounded-2xl ${
                  message.sender === 'me'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {message.attachment && <AttachmentPreview attachment={message.attachment} />}
                {message.text && <p className="text-sm break-words">{message.text}</p>}
                <div className="flex items-center justify-between mt-1 space-x-2">
                  <div className="flex items-center space-x-1">
                    {message.encrypted && (
                      <Shield className="w-3 h-3 text-green-300 opacity-70" />
                    )}
                    <span className={`text-xs ${
                      message.sender === 'me' ? 'text-green-100' : 'text-gray-300'
                    }`}>
                      {message.timestamp}
                    </span>
                  </div>
                  {message.sender === 'me' && (
                    <div className="flex-shrink-0">
                      {getStatusIcon(message.status)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
