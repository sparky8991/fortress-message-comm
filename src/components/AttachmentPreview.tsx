
import React from 'react';
import { FileText, Download } from 'lucide-react';
import { EncryptedImageViewer } from './EncryptedImageViewer';

interface Attachment {
  name: string;
  url: string;
  type: string;
  metadata?: {
    salt: string;
    iv: string;
    originalName: string;
  };
}

interface AttachmentPreviewProps {
  attachment: Attachment;
}

export const AttachmentPreview = ({ attachment }: AttachmentPreviewProps) => {
  const isImage = attachment.type.startsWith('image/');
  const isVideo = attachment.type.startsWith('video/');
  const isAudio = attachment.type.startsWith('audio/');
  const isEncryptedFile = attachment.name.includes('encrypted_') && attachment.name.endsWith('.enc');

  // Handle encrypted images
  if (isEncryptedFile && attachment.metadata) {
    return <EncryptedImageViewer attachment={attachment} />;
  }

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block mb-2">
        <img src={attachment.url} alt={attachment.name} className="max-w-full h-auto rounded-lg" style={{ maxHeight: '300px' }} />
      </a>
    );
  }

  if (isVideo) {
    return (
      <div className="mb-2">
        <video controls src={attachment.url} className="max-w-full h-auto rounded-lg" style={{ maxHeight: '300px' }}>
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="my-2">
        <audio controls src={attachment.url} className="w-full">
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  return (
    <a 
      href={attachment.url} 
      download={attachment.name} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="bg-gray-600/50 p-3 rounded-lg flex items-center space-x-3 my-2 hover:bg-gray-500/50 transition-colors"
    >
      <FileText className="w-8 h-8 text-white flex-shrink-0" />
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-medium text-white truncate">{attachment.name}</p>
      </div>
      <Download className="w-5 h-5 text-gray-300 flex-shrink-0" />
    </a>
  );
};
