
import React, { useState } from 'react';
import { Lock, Upload, Eye, EyeOff, Shield, Skull, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ImageEncryption } from '@/utils/imageEncryption';

interface EncryptedImageUploadProps {
  onEncryptedImageReady: (encryptedFile: File, metadata: { salt: string, iv: string, originalName: string }) => void;
  onCancel: () => void;
}

export const EncryptedImageUpload = ({ onEncryptedImageReady, onCancel }: EncryptedImageUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '⚠️ INVALID PAYLOAD',
        description: 'Only image files accepted in this secure channel.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: '🎯 TARGET ACQUIRED',
      description: 'File loaded into encryption chamber.',
    });
  };

  const handleEncryptAndUpload = async () => {
    if (!selectedFile || !password.trim()) {
      toast({
        title: '🚫 ACCESS DENIED',
        description: 'Encryption key and payload required for secure transmission.',
        variant: 'destructive'
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: '🔐 WEAK CIPHER',
        description: 'Minimum 6-character encryption key required for deep web security.',
        variant: 'destructive'
      });
      return;
    }

    setIsEncrypting(true);

    try {
      const { encryptedData, salt, iv, fileName } = await ImageEncryption.encryptImage(selectedFile, password);
      
      const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const encryptedFile = new File([encryptedBlob], `encrypted_${fileName}.enc`, { type: 'application/octet-stream' });

      const metadata = {
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        originalName: fileName
      };

      onEncryptedImageReady(encryptedFile, metadata);
      
      toast({
        title: '🔒 PAYLOAD ENCRYPTED',
        description: 'Data successfully obfuscated. Ready for dark transmission.',
      });
    } catch (error) {
      console.error('Encryption error:', error);
      toast({
        title: '💀 ENCRYPTION FAILED',
        description: 'Cipher protocol corrupted. Retry secure operation.',
        variant: 'destructive'
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="bg-black/95 border-2 border-red-500/50 rounded-lg p-3 space-y-3 shadow-2xl shadow-red-500/20 backdrop-blur-sm w-full max-w-full overflow-hidden relative">
      {/* Close Button */}
      <button
        onClick={onCancel}
        className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors z-10 flex-shrink-0"
        title="Close encryption panel"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center space-x-2 border-b border-red-500/30 pb-2 min-w-0 pr-8">
        <Skull className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />
        <h3 className="text-sm font-mono font-bold text-red-500 tracking-wider truncate">
          [ENCRYPT_PAYLOAD]
        </h3>
        <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
      </div>

      <div className="space-y-3 w-full">
        <div className="w-full">
          <Label htmlFor="image-file" className="text-xs text-green-400 font-mono uppercase tracking-wide block mb-1">
            › Select Target File
          </Label>
          <div className="w-full">
            <input
              id="image-file"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('image-file')?.click()}
              className="w-full h-10 justify-start border-green-500/50 bg-black/50 text-green-400 hover:text-green-300 hover:bg-green-500/10 hover:border-green-400 font-mono text-xs transition-all duration-300"
            >
              <Upload />
              <span className="truncate min-w-0">
                {selectedFile ? `[${selectedFile.name}]` : '[BROWSE_FILES]'}
              </span>
            </Button>
          </div>
        </div>

        <div className="w-full">
          <Label htmlFor="encryption-password" className="text-xs text-green-400 font-mono uppercase tracking-wide block mb-1">
            › Cipher Key
          </Label>
          <div className="relative w-full">
            <Input
              id="encryption-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter deep web encryption key..."
              className="bg-black/80 border-green-500/50 text-green-400 placeholder-green-600/50 pr-10 h-10 font-mono text-xs focus:border-green-400 focus:ring-green-400/20 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 hover:text-green-400 transition-colors flex-shrink-0"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-green-600/70 mt-1 font-mono break-words">
            › Share cipher with authorized users only
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-2 pt-2 w-full">
        <Button
          onClick={handleEncryptAndUpload}
          disabled={!selectedFile || !password.trim() || isEncrypting}
          className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-mono text-xs tracking-wide transition-all duration-300 shadow-lg shadow-red-600/30"
        >
          {isEncrypting ? '[ENCRYPTING...]' : '[ENCRYPT & TRANSMIT]'}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full h-10 border-gray-600 bg-black/50 text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 font-mono text-xs"
        >
          [ABORT]
        </Button>
      </div>
    </div>
  );
};
