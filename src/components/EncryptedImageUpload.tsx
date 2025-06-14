
import React, { useState } from 'react';
import { Lock, Upload, Eye, EyeOff, Shield, X } from 'lucide-react';
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
        title: '⚠️ Invalid File',
        description: 'Only image files are supported for encryption.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: '✅ File Selected',
      description: 'Image loaded and ready for encryption.',
    });
  };

  const handleEncryptAndUpload = async () => {
    if (!selectedFile || !password.trim()) {
      toast({
        title: '🚫 Missing Information',
        description: 'Please select an image and enter a password.',
        variant: 'destructive'
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: '🔐 Password Too Short',
        description: 'Password must be at least 6 characters long.',
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
        title: '🔒 Encryption Complete',
        description: 'Image encrypted successfully and ready to send.',
      });
    } catch (error) {
      console.error('Encryption error:', error);
      toast({
        title: '❌ Encryption Failed',
        description: 'Failed to encrypt image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-2 right-2 z-50 bg-gray-900 border border-green-500/50 rounded-lg p-4 shadow-2xl animate-in slide-in-from-bottom-2">
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Lock className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Encrypt Image</h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* File Selection */}
        <div>
          <Label htmlFor="image-file" className="text-sm font-medium text-gray-300 mb-2 block">
            Select Image
          </Label>
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
            className="w-full justify-start bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            {selectedFile ? selectedFile.name : 'Choose Image File'}
          </Button>
        </div>

        {/* Password Input */}
        <div>
          <Label htmlFor="encryption-password" className="text-sm font-medium text-gray-300 mb-2 block">
            Password (min 6 chars)
          </Label>
          <div className="relative">
            <Input
              id="encryption-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter secure password..."
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 mt-4">
        <Button
          onClick={handleEncryptAndUpload}
          disabled={!selectedFile || !password.trim() || isEncrypting}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
        >
          {isEncrypting ? (
            <>
              <Lock className="w-4 h-4 mr-2 animate-spin" />
              Encrypting...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Encrypt & Send
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
