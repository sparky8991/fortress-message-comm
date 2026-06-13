
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
    mimeType?: string;
    shareCode?: string;
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
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="my-2 block rounded-sm border border-[#1C2B22] bg-black/80 p-2 hover:border-[#1E5C3C]">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="h-auto w-full rounded-sm border border-[#1C2B22] object-contain max-h-[250px] sm:max-h-[300px]"
        />
      </a>
    );
  }

  if (isVideo) {
    return (
      <div className="my-2 rounded-sm border border-[#1C2B22] bg-black/80 p-2">
        <video controls src={attachment.url} className="h-auto w-full rounded-sm border border-[#1C2B22] max-h-[250px] sm:max-h-[300px]">
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="my-2 rounded-sm border border-[#1C2B22] bg-black/80 p-2">
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
      className="my-2 flex items-center space-x-3 rounded-sm border border-[#1C2B22] bg-[#0F1612] p-3 font-mono transition-colors hover:border-[#1E5C3C] hover:bg-[#101814]"
    >
      <FileText className="h-7 w-7 flex-shrink-0 text-[#36E27B]" />
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[#ECF7F0]">{attachment.name}</p>
      </div>
      <Download className="h-4 w-4 flex-shrink-0 text-[#76897D]" />
    </a>
  );
};
