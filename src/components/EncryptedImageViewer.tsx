
import React, { useCallback, useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, Download, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ImageEncryption } from '@/utils/imageEncryption';

interface EncryptedImageViewerProps {
  attachment: {
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
  };
}

export const EncryptedImageViewer = ({ attachment }: EncryptedImageViewerProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [autoDecryptAttempted, setAutoDecryptAttempted] = useState(false);

  const decryptWithKey = useCallback(async (key: string, showSuccessToast = true) => {
    if (!key.trim()) {
      toast({
        title: '🚫 ACCESS DENIED',
        description: 'Cipher key required for payload decryption.',
        variant: 'destructive'
      });
      return false;
    }

    if (!attachment.metadata) {
      toast({
        title: '💀 CORRUPTED DATA',
        description: 'Encrypted payload missing metadata headers.',
        variant: 'destructive'
      });
      return false;
    }

    setIsDecrypting(true);

    try {
      const response = await fetch(attachment.url);
      const encryptedData = await response.arrayBuffer();

      const salt = new Uint8Array(atob(attachment.metadata.salt).split('').map(char => char.charCodeAt(0)));
      const iv = new Uint8Array(atob(attachment.metadata.iv).split('').map(char => char.charCodeAt(0)));

      const decryptedData = await ImageEncryption.decryptImage(encryptedData, key, salt, iv);
      
      const mimeType = attachment.metadata.mimeType || 'image/jpeg';
      const blobUrl = ImageEncryption.createBlobUrl(decryptedData, mimeType);
      
      setDecryptedImageUrl(blobUrl);
      setIsDecrypted(true);
      
      if (showSuccessToast) {
        toast({
          title: '🔓 PAYLOAD DECRYPTED',
          description: 'Cipher successfully broken. Data accessed.',
        });
      }
      return true;
    } catch (error) {
      console.error('Decryption error:', error);
      toast({
        title: '💥 DECRYPTION FAILED',
        description: 'Invalid cipher key or corrupted payload.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsDecrypting(false);
    }
  }, [attachment.metadata, attachment.url]);

  const handleDecrypt = async () => {
    await decryptWithKey(password);
  };

  const handleDownload = () => {
    if (decryptedImageUrl && attachment.metadata) {
      const link = document.createElement('a');
      link.href = decryptedImageUrl;
      link.download = attachment.metadata.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: '📥 PAYLOAD EXTRACTED',
        description: 'Decrypted data saved to local storage.',
      });
    }
  };

  React.useEffect(() => {
    return () => {
      if (decryptedImageUrl) {
        URL.revokeObjectURL(decryptedImageUrl);
      }
    };
  }, [decryptedImageUrl]);

  useEffect(() => {
    const shareCode = attachment.metadata?.shareCode;
    if (!shareCode || isDecrypted || isDecrypting || autoDecryptAttempted) return;

    setPassword(shareCode);
    setAutoDecryptAttempted(true);
    void decryptWithKey(shareCode, false);
  }, [attachment.metadata?.shareCode, autoDecryptAttempted, decryptWithKey, isDecrypted, isDecrypting]);

  if (isDecrypted && decryptedImageUrl) {
    return (
      <div className="my-2 w-full max-w-full overflow-hidden rounded-sm border border-[#1E5C3C] bg-black/90 p-2">
        <div className="w-full overflow-hidden rounded-sm">
          <img 
            src={decryptedImageUrl} 
            alt={attachment.metadata?.originalName || 'Decrypted payload'} 
            className="h-auto w-full rounded-sm border border-[#1C2B22] object-contain max-h-[250px] sm:max-h-[300px]"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-2">
          <span className="flex items-center break-all font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#36E27B]">
            <Lock className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">[DECRYPTED]: {attachment.metadata?.originalName}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-8 w-full flex-shrink-0 rounded-sm border-[#1E5C3C] bg-black/50 font-mono text-[9px] uppercase tracking-[0.14em] text-[#36E27B] hover:bg-[#36E27B]/10 sm:w-auto"
          >
            <Download className="w-3 h-3 mr-1" />
            [EXTRACT]
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 w-full max-w-full overflow-hidden rounded-sm border border-[#5C2420] bg-black/95 p-3 shadow-[0_0_28px_rgba(255,107,97,0.14)] backdrop-blur-sm">
      <div className="flex items-center space-x-2 mb-3 min-w-0">
        <Terminal className="w-4 h-4 text-[#FF6B61] animate-pulse flex-shrink-0" />
        <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF6B61]">
          [ENCRYPTED_PAYLOAD]
        </span>
      </div>
      
      <p className="mb-3 break-words font-mono text-[10px] text-[#FF8A82]/80">
        {'>'} Enter the shared encryption key to decrypt payload
      </p>
      
      <div className="space-y-3 w-full">
        <div className="relative w-full">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Paste encryption key here..."
            className="h-10 w-full rounded-sm border-[#5C2420] bg-black/80 pr-10 font-mono text-[11px] text-[#FF8A82] placeholder:text-[#FF6B61]/45 focus:border-[#FF6B61] focus:ring-[#FF6B61]/20"
            onKeyPress={(e) => e.key === 'Enter' && handleDecrypt()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 flex-shrink-0 -translate-y-1/2 text-[#FF6B61]/70 transition-colors hover:text-[#FF8A82]"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        <Button
          onClick={handleDecrypt}
          disabled={!password.trim() || isDecrypting}
          size="sm"
          className="h-10 w-full rounded-sm bg-[#8C1D18] font-mono text-[10px] uppercase tracking-[0.16em] text-[#FFE0DC] shadow-[0_0_18px_rgba(140,29,24,0.22)] transition-colors hover:bg-[#A82822]"
        >
          {isDecrypting ? '[DECRYPTING...]' : '[DECRYPT_PAYLOAD]'}
        </Button>
      </div>
    </div>
  );
};
