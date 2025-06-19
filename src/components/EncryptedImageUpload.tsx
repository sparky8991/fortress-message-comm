
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

  const modalContent = (
    <div className="fixed inset-0 w-full h-full bg-black z-[10000] overflow-hidden">
      <div className="w-full h-full bg-gray-900 border-2 border-green-500/50 flex flex-col justify-center p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-4">
            <Lock className="w-12 h-12 text-green-400" />
            <h3 className="text-4xl font-bold text-white">ENCRYPT PAYLOAD</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-3 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-12 flex-1 max-w-4xl mx-auto w-full flex flex-col justify-center">
          <FileSelector selectedFile={selectedFile} onFileSelect={setSelectedFile} />
          <PasswordDisplay 
            password={generatedPassword}
            onRegeneratePassword={generateSecurePassword}
            onCopyPassword={copyPasswordToClipboard}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-6 mt-12 max-w-4xl mx-auto w-full">
          <Button
            onClick={handleEncryptAndUpload}
            disabled={!selectedFile || isEncrypting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xl py-8"
          >
            {isEncrypting ? (
              <>
                <Lock className="w-6 h-6 mr-4 animate-spin" />
                ENCRYPTING...
              </>
            ) : (
              <>
                <Shield className="w-6 h-6 mr-4" />
                ENCRYPT & DEPLOY
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xl py-8 px-12"
          >
            ABORT
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
