
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
  onEncryptedImageReady: (encryptedFile: File, metadata: { salt: string, iv: string, originalName: string, mimeType: string, shareCode: string }) => void;
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
        mimeType: selectedFile.type,
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
      <div className="w-full h-full bg-gray-900 border-2 border-green-500/50 flex flex-col p-4 sm:p-6 md:p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-12">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Lock className="w-8 h-8 md:w-12 md:h-12 text-green-400" />
            <h3 className="ft-head font-bold text-white">ENCRYPT PAYLOAD</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 md:p-3 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        </div>

        {/* Content Area - Flexible */}
        <div className="flex-1 flex flex-col justify-center space-y-8 md:space-y-12 max-w-4xl mx-auto w-full min-h-0">
          <FileSelector selectedFile={selectedFile} onFileSelect={setSelectedFile} />
          <PasswordDisplay 
            password={generatedPassword}
            onRegeneratePassword={generateSecurePassword}
            onCopyPassword={copyPasswordToClipboard}
          />
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 md:space-x-6 mt-6 md:mt-12 max-w-4xl mx-auto w-full pb-safe">
          <Button
            onClick={handleEncryptAndUpload}
            disabled={!selectedFile || isEncrypting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white ft-head py-4 md:py-8"
          >
            {isEncrypting ? (
              <>
                <Lock className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-4 animate-spin" />
                ENCRYPTING...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-4" />
                ENCRYPT & DEPLOY
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 ft-head py-4 md:py-8 px-8 md:px-12"
          >
            ABORT
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
