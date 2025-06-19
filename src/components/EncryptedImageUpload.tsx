
import React, { useState } from 'react';
import { Lock, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ImageEncryption } from '@/utils/imageEncryption';
import { usePasswordGenerator } from '@/hooks/usePasswordGenerator';
import { PasswordDisplay } from '@/components/PasswordDisplay';
import { FileSelector } from '@/components/FileSelector';

interface EncryptedImageUploadProps {
  onEncryptedImageReady: (encryptedFile: File, metadata: { salt: string, iv: string, originalName: string, shareCode: string }) => void;
  onCancel: () => void;
}

export const EncryptedImageUpload = ({ onEncryptedImageReady, onCancel }: EncryptedImageUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  
  const { generatedPassword, generateSecurePassword, copyPasswordToClipboard } = usePasswordGenerator();

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-16 p-4 overflow-y-auto">
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
          <FileSelector selectedFile={selectedFile} onFileSelect={setSelectedFile} />
          <PasswordDisplay 
            password={generatedPassword}
            onRegeneratePassword={generateSecurePassword}
            onCopyPassword={copyPasswordToClipboard}
          />
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
