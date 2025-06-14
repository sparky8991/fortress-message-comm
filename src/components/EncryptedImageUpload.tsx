
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
    <div className="bg-gray-900 border-2 border-red-500 rounded-lg p-4 space-y-4 shadow-2xl w-full max-w-full overflow-hidden relative">
      {/* Close Button */}
      <button
        onClick={onCancel}
        className="absolute top-3 right-3 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors z-10 flex-shrink-0"
        title="Close encryption panel"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-center space-x-3 border-b border-red-500/50 pb-3 min-w-0 pr-12">
        <Skull className="w-6 h-6 text-red-400 animate-pulse flex-shrink-0" />
        <h3 className="text-lg font-mono font-bold text-red-400 tracking-wider truncate">
          ENCRYPT PAYLOAD
        </h3>
        <Shield className="w-6 h-6 text-green-400 flex-shrink-0" />
      </div>

      <div className="space-y-4 w-full">
        <div className="w-full">
          <Label htmlFor="image-file" className="text-sm text-green-400 font-mono uppercase tracking-wide block mb-2 font-semibold">
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
              className="w-full h-14 justify-start border-2 border-green-500 bg-gray-800 text-green-400 hover:text-green-300 hover:bg-green-500/20 hover:border-green-400 font-mono text-sm transition-all duration-300"
            >
              <Upload className="w-5 h-5 mr-3" />
              <span className="truncate min-w-0 text-left">
                {selectedFile ? `${selectedFile.name}` : 'BROWSE FILES'}
              </span>
            </Button>
          </div>
        </div>

        <div className="w-full">
          <Label htmlFor="encryption-password" className="text-sm text-green-400 font-mono uppercase tracking-wide block mb-2 font-semibold">
            › Cipher Key
          </Label>
          <div className="relative w-full">
            <Input
              id="encryption-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter deep web encryption key..."
              className="bg-gray-800 border-2 border-green-500 text-green-400 placeholder-green-600/70 pr-12 h-12 font-mono text-sm focus:border-green-400 focus:ring-green-400/30 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 hover:text-green-400 transition-colors flex-shrink-0 p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-sm text-green-500/80 mt-2 font-mono">
            › Share cipher with authorized users only
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-3 pt-2 w-full">
        <Button
          onClick={handleEncryptAndUpload}
          disabled={!selectedFile || !password.trim() || isEncrypting}
          className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-mono text-sm font-bold tracking-wide transition-all duration-300 shadow-lg shadow-red-600/40 disabled:opacity-50"
        >
          {isEncrypting ? 'ENCRYPTING...' : 'ENCRYPT & TRANSMIT'}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full h-12 border-2 border-gray-600 bg-gray-800 text-gray-300 hover:text-gray-100 hover:bg-gray-700 font-mono text-sm"
        >
          ABORT
        </Button>
      </div>
    </div>
  );
};
