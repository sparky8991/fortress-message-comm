
import React, { useState } from 'react';
import { Lock, Upload, Eye, EyeOff } from 'lucide-react';
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
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleEncryptAndUpload = async () => {
    if (!selectedFile || !password.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select an image and enter a password.',
        variant: 'destructive'
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive'
      });
      return;
    }

    setIsEncrypting(true);

    try {
      const { encryptedData, salt, iv, fileName } = await ImageEncryption.encryptImage(selectedFile, password);
      
      // Create a blob from encrypted data
      const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const encryptedFile = new File([encryptedBlob], `encrypted_${fileName}.enc`, { type: 'application/octet-stream' });

      // Convert salt and iv to base64 for storage
      const metadata = {
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        originalName: fileName
      };

      onEncryptedImageReady(encryptedFile, metadata);
      
      toast({
        title: 'Image encrypted successfully',
        description: 'Your image has been encrypted and is ready to send.',
      });
    } catch (error) {
      console.error('Encryption error:', error);
      toast({
        title: 'Encryption failed',
        description: 'Failed to encrypt the image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <Lock className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-medium text-white">Encrypt Image</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="image-file" className="text-sm text-gray-300">Select Image</Label>
          <div className="mt-1">
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
              className="w-full border-gray-600 text-gray-300 hover:text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              {selectedFile ? selectedFile.name : 'Choose Image'}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="encryption-password" className="text-sm text-gray-300">Encryption Password</Label>
          <div className="mt-1 relative">
            <Input
              id="encryption-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to encrypt image..."
              className="bg-gray-700 border-gray-600 text-white pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Share this password with people who should see the image
          </p>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button
          onClick={handleEncryptAndUpload}
          disabled={!selectedFile || !password.trim() || isEncrypting}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isEncrypting ? 'Encrypting...' : 'Encrypt & Send'}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-gray-600 text-gray-300 hover:text-white"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
