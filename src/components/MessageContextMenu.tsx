
import React, { useState } from 'react';
import { Reply, Lock, Users } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { EncryptedImageUpload } from './EncryptedImageUpload';
import { buildEncryptedPayloadMessage, stripEncryptedPayloadSecrets } from '@/utils/encryptedPayloadMessage';
import { toast } from '@/hooks/use-toast';

type MessageMetadata = Record<string, unknown> & {
  salt?: string;
  iv?: string;
  originalName?: string;
  mimeType?: string;
  shareCode?: string;
};

interface MessageContextMenuProps {
  children: React.ReactNode;
  onReply: (messageId: string, messageText: string) => void;
  messageId: string;
  messageText: string;
  onSendMessage: (message: string, attachment: File | null, encryptionMetadata?: MessageMetadata) => void;
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

  const handleEncryptedImageReady = (encryptedFile: File, metadata: MessageMetadata) => {
    const shareMessage = buildEncryptedPayloadMessage(metadata);
    const safeMetadata = stripEncryptedPayloadSecrets(metadata);
    const shareCode = typeof metadata?.shareCode === 'string' ? metadata.shareCode : '';

    if (shareCode) {
      navigator.clipboard.writeText(shareCode).catch((error) => {
        console.error('Failed to copy decryption key:', error);
        toast({
          title: 'COPY FAILED',
          description: 'Copy the decryption key from the encryption dialog before sending.',
          variant: 'destructive'
        });
      });
    }

    onSendMessage(shareMessage, encryptedFile, safeMetadata);
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
