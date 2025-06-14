
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Download, Skull, Terminal } from 'lucide-react';
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
    };
  };
}

export const EncryptedImageViewer = ({ attachment }: EncryptedImageViewerProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);

  const handleDecrypt = async () => {
    if (!password.trim()) {
      toast({
        title: '🚫 ACCESS DENIED',
        description: 'Cipher key required for payload decryption.',
        variant: 'destructive'
      });
      return;
    }

    if (!attachment.metadata) {
      toast({
        title: '💀 CORRUPTED DATA',
        description: 'Encrypted payload missing metadata headers.',
        variant: 'destructive'
      });
      return;
    }

    setIsDecrypting(true);

    try {
      const response = await fetch(attachment.url);
      const encryptedData = await response.arrayBuffer();

      const salt = new Uint8Array(atob(attachment.metadata.salt).split('').map(char => char.charCodeAt(0)));
      const iv = new Uint8Array(atob(attachment.metadata.iv).split('').map(char => char.charCodeAt(0)));

      const decryptedData = await ImageEncryption.decryptImage(encryptedData, password, salt, iv);
      
      const mimeType = 'image/jpeg';
      const blobUrl = ImageEncryption.createBlobUrl(decryptedData, mimeType);
      
      setDecryptedImageUrl(blobUrl);
      setIsDecrypted(true);
      
      toast({
        title: '🔓 PAYLOAD DECRYPTED',
        description: 'Cipher successfully broken. Data accessed.',
      });
    } catch (error) {
      console.error('Decryption error:', error);
      toast({
        title: '💥 DECRYPTION FAILED',
        description: 'Invalid cipher key or corrupted payload.',
        variant: 'destructive'
      });
    } finally {
      setIsDecrypting(false);
    }
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

  if (isDecrypted && decryptedImageUrl) {
    return (
      <div className="my-2 bg-black/90 border border-green-500/30 rounded-lg p-2 w-full max-w-full overflow-hidden">
        <div className="w-full overflow-hidden rounded-lg">
          <img 
            src={decryptedImageUrl} 
            alt={attachment.metadata?.originalName || 'Decrypted payload'} 
            className="w-full h-auto object-contain border border-green-500/20 rounded-lg max-h-[250px] sm:max-h-[300px]" 
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-2">
          <span className="text-green-400 flex items-center font-mono text-xs break-all">
            <Lock className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">[DECRYPTED]: {attachment.metadata?.originalName}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="text-xs border-green-500/50 bg-black/50 text-green-400 hover:bg-green-500/10 font-mono h-8 flex-shrink-0 w-full sm:w-auto"
          >
            <Download className="w-3 h-3 mr-1" />
            [EXTRACT]
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/95 border-2 border-red-500/50 rounded-lg my-2 p-3 shadow-2xl shadow-red-500/20 backdrop-blur-sm w-full max-w-full overflow-hidden">
      <div className="flex items-center space-x-2 mb-3 min-w-0">
        <Terminal className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />
        <span className="text-xs font-mono font-bold text-red-500 tracking-wider uppercase truncate">
          [ENCRYPTED_PAYLOAD]
        </span>
        <Skull className="w-4 h-4 text-red-400 flex-shrink-0" />
      </div>
      
      <p className="text-xs text-red-400/80 mb-3 font-mono break-words">
        › Cipher key required to decrypt dark web transmission
      </p>
      
      <div className="space-y-3 w-full">
        <div className="relative w-full">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter decryption cipher..."
            className="bg-black/80 border-red-500/50 text-red-400 placeholder-red-600/50 text-xs pr-10 h-10 font-mono focus:border-red-400 focus:ring-red-400/20 w-full"
            onKeyPress={(e) => e.key === 'Enter' && handleDecrypt()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-600 hover:text-red-400 transition-colors flex-shrink-0"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        <Button
          onClick={handleDecrypt}
          disabled={!password.trim() || isDecrypting}
          size="sm"
          className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-mono text-xs tracking-wide transition-all duration-300 shadow-lg shadow-red-600/30"
        >
          {isDecrypting ? '[DECRYPTING...]' : '[DECRYPT_PAYLOAD]'}
        </Button>
      </div>
    </div>
  );
};
