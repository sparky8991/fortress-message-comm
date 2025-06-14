
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Download } from 'lucide-react';
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
        title: 'Password required',
        description: 'Please enter the password to decrypt the image.',
        variant: 'destructive'
      });
      return;
    }

    if (!attachment.metadata) {
      toast({
        title: 'Invalid encrypted image',
        description: 'This image is missing encryption metadata.',
        variant: 'destructive'
      });
      return;
    }

    setIsDecrypting(true);

    try {
      // Fetch the encrypted file
      const response = await fetch(attachment.url);
      const encryptedData = await response.arrayBuffer();

      // Convert base64 salt and iv back to Uint8Array
      const salt = new Uint8Array(atob(attachment.metadata.salt).split('').map(char => char.charCodeAt(0)));
      const iv = new Uint8Array(atob(attachment.metadata.iv).split('').map(char => char.charCodeAt(0)));

      // Decrypt the image
      const decryptedData = await ImageEncryption.decryptImage(encryptedData, password, salt, iv);
      
      // Create blob URL for the decrypted image
      const mimeType = 'image/jpeg'; // You might want to store the original mime type in metadata
      const blobUrl = ImageEncryption.createBlobUrl(decryptedData, mimeType);
      
      setDecryptedImageUrl(blobUrl);
      setIsDecrypted(true);
      
      toast({
        title: 'Image decrypted successfully',
        description: 'The encrypted image has been unlocked.',
      });
    } catch (error) {
      console.error('Decryption error:', error);
      toast({
        title: 'Decryption failed',
        description: 'Invalid password or corrupted image data.',
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
    }
  };

  // Clean up blob URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (decryptedImageUrl) {
        URL.revokeObjectURL(decryptedImageUrl);
      }
    };
  }, [decryptedImageUrl]);

  if (isDecrypted && decryptedImageUrl) {
    return (
      <div className="my-2">
        <img 
          src={decryptedImageUrl} 
          alt={attachment.metadata?.originalName || 'Decrypted image'} 
          className="max-w-full h-auto rounded-lg" 
          style={{ maxHeight: '300px' }} 
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-green-500 flex items-center">
            <Lock className="w-3 h-3 mr-1" />
            Decrypted: {attachment.metadata?.originalName}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-700/50 p-4 rounded-lg my-2 border border-yellow-500/50">
      <div className="flex items-center space-x-2 mb-3">
        <Lock className="w-5 h-5 text-yellow-500" />
        <span className="text-sm font-medium text-yellow-500">Encrypted Image</span>
      </div>
      
      <p className="text-xs text-gray-300 mb-3">
        This image is encrypted. Enter the password to view it.
      </p>
      
      <div className="space-y-3">
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter decryption password..."
            className="bg-gray-600 border-gray-500 text-white text-sm pr-10"
            onKeyPress={(e) => e.key === 'Enter' && handleDecrypt()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        <Button
          onClick={handleDecrypt}
          disabled={!password.trim() || isDecrypting}
          size="sm"
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
        >
          {isDecrypting ? 'Decrypting...' : 'Decrypt Image'}
        </Button>
      </div>
    </div>
  );
};
