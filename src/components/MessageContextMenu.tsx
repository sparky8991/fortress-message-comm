
import React, { useState } from 'react';
import { Reply, Lock, Users } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { EncryptedImageUpload } from './EncryptedImageUpload';

interface MessageContextMenuProps {
  children: React.ReactNode;
  onReply: (messageId: string, messageText: string) => void;
  messageId: string;
  messageText: string;
  onSendMessage: (message: string, attachment: File | null, encryptionMetadata?: any) => void;
  onStartNewGroup?: (contactName: string) => void;
  contactName: string;
}

export const MessageContextMenu = ({ 
  children, 
  onReply, 
  messageId, 
  messageText,
  onSendMessage,
  onStartNewGroup,
  contactName
}: MessageContextMenuProps) => {
  const [showEncryptedUpload, setShowEncryptedUpload] = useState(false);

  const handleReply = () => {
    onReply(messageId, messageText);
  };

  const handleStartNewGroup = () => {
    if (onStartNewGroup) {
      onStartNewGroup(contactName);
    }
  };

  const handleEncryptedImageReady = (encryptedFile: File, metadata: any) => {
    const shareMessage = `🔒 ENCRYPTED PAYLOAD DEPLOYED\n\nDecryption Key: ${metadata.shareCode}\n\n⚠️ CLASSIFIED - Share key securely with authorized personnel only`;
    onSendMessage(shareMessage, encryptedFile, metadata);
    setShowEncryptedUpload(false);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-gray-800 border-gray-700">
          <ContextMenuItem 
            onClick={handleReply}
            className="text-white hover:bg-gray-700 cursor-pointer"
          >
            <Reply className="w-4 h-4 mr-2" />
            Reply to message
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => setShowEncryptedUpload(true)}
            className="text-red-400 hover:bg-gray-700 cursor-pointer"
          >
            <Lock className="w-4 h-4 mr-2" />
            Send encrypted image
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={handleStartNewGroup}
            className="text-blue-400 hover:bg-gray-700 cursor-pointer"
          >
            <Users className="w-4 h-4 mr-2" />
            Start new group with {contactName}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Encrypted Upload Overlay */}
      {showEncryptedUpload && (
        <EncryptedImageUpload
          onEncryptedImageReady={handleEncryptedImageReady}
          onCancel={() => setShowEncryptedUpload(false)}
        />
      )}
    </>
  );
};
