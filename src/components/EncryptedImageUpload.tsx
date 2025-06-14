
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
    <div className="bg-white border border-gray-300 rounded-lg p-4 space-y-4 shadow-lg w-full max-w-full overflow-hidden relative">
      {/* Close Button */}
      <button
        onClick={onCancel}
        className="absolute top-3 right-3 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors z-10"
        title="Close encryption panel"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-gray-200 pb-3 pr-10">
        <Lock className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Encrypt Image
        </h3>
        <Shield className="w-5 h-5 text-green-600" />
      </div>

      <div className="space-y-4 w-full">
        {/* File Selection */}
        <div className="w-full">
          <Label htmlFor="image-file" className="text-sm font-medium text-gray-700 block mb-2">
            Select Image to Encrypt
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
              className="w-full h-12 justify-start border-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
            >
              <Upload className="w-5 h-5 mr-3" />
              <span className="truncate text-left font-medium">
                {selectedFile ? selectedFile.name : 'Choose Image File'}
              </span>
            </Button>
          </div>
        </div>

        {/* Password Input */}
        <div className="w-full">
          <Label htmlFor="encryption-password" className="text-sm font-medium text-gray-700 block mb-2">
            Encryption Password
          </Label>
          <div className="relative w-full">
            <Input
              id="encryption-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a secure password..."
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder-gray-500 pr-12 h-12 text-base focus:border-blue-500 focus:ring-blue-500/20 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Password must be at least 6 characters long
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col space-y-3 pt-2 w-full">
        <Button
          onClick={handleEncryptAndUpload}
          disabled={!selectedFile || !password.trim() || isEncrypting}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full h-12 border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
