
import React, { useState, useEffect } from 'react';
import { Lock, Upload, Eye, EyeOff, Shield, X, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ImageEncryption } from '@/utils/imageEncryption';

interface EncryptedImageUploadProps {
  onEncryptedImageReady: (encryptedFile: File, metadata: { salt: string, iv: string, originalName: string, shareCode: string }) => void;
  onCancel: () => void;
}

export const EncryptedImageUpload = ({ onEncryptedImageReady, onCancel }: EncryptedImageUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Generate secure military-grade password on component mount
  useEffect(() => {
    generateSecurePassword();
  }, []);

  const generateSecurePassword = () => {
    // Military-grade password generation: 32 characters, alphanumeric + symbols
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < array.length; i++) {
      password += charset[array[i] % charset.length];
    }
    
    setGeneratedPassword(password);
    toast({
      title: '🔐 SECURE KEY GENERATED',
      description: 'Military-grade encryption key ready for deployment.',
    });
  };

  const copyPasswordToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast({
        title: '📋 KEY COPIED',
        description: 'Encryption key copied to secure clipboard.',
      });
    } catch (error) {
      toast({
        title: '❌ COPY FAILED',
        description: 'Failed to copy key to clipboard.',
        variant: 'destructive'
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '⚠️ INVALID PAYLOAD',
        description: 'Only image files supported for encryption.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: '✅ PAYLOAD LOADED',
      description: 'Image ready for military-grade encryption.',
    });
  };

  const handleEncryptAndUpload = async () => {
    if (!selectedFile) {
      toast({
        title: '🚫 NO PAYLOAD',
        description: 'Please select an image for encryption.',
        variant: 'destructive'
      });
      return;
    }

    setIsEncrypting(true);

    try {
      const { encryptedData, salt, iv, fileName } = await ImageEncryption.encryptImage(selectedFile, generatedPassword);
      
      const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const encryptedFile = new File([encryptedBlob], `encrypted_${fileName}.enc`, { type: 'application/octet-stream' });

      const metadata = {
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        originalName: fileName,
        shareCode: generatedPassword
      };

      onEncryptedImageReady(encryptedFile, metadata);
      
      toast({
        title: '🔒 ENCRYPTION COMPLETE',
        description: 'Payload encrypted with military-grade security.',
      });
    } catch (error) {
      console.error('Encryption error:', error);
      toast({
        title: '❌ ENCRYPTION FAILED',
        description: 'Failed to encrypt payload. Try again.',
        variant: 'destructive'
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-2 border-green-500/50 rounded-lg p-4 shadow-2xl w-full max-w-md animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">ENCRYPT PAYLOAD</h3>
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
              Select Image Payload
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

          {/* Generated Password Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-green-400">
                Generated Encryption Key
              </Label>
              <button
                onClick={generateSecurePassword}
                className="p-1 text-green-400 hover:text-green-300 transition-colors"
                title="Generate New Key"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={generatedPassword}
                readOnly
                className="bg-gray-700 border-green-500/50 text-green-400 font-mono text-xs pr-20"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={copyPasswordToClipboard}
                  className="p-1 text-green-400 hover:text-green-300 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-green-400/70 mt-1 font-mono">
              › Share this key with authorized personnel for decryption
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-6">
          <Button
            onClick={handleEncryptAndUpload}
            disabled={!selectedFile || isEncrypting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
          >
            {isEncrypting ? (
              <>
                <Lock className="w-4 h-4 mr-2 animate-spin" />
                ENCRYPTING...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                ENCRYPT & DEPLOY
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-sm"
          >
            ABORT
          </Button>
        </div>
      </div>
    </div>
  );
};
