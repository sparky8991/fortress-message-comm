
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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-gray-900 border-2 border-green-500/50 rounded-lg p-8 shadow-2xl w-full max-w-2xl min-h-[60vh] animate-in fade-in-50 zoom-in-95 flex flex-col justify-center">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Lock className="w-8 h-8 text-green-400" />
            <h3 className="text-2xl font-bold text-white">ENCRYPT PAYLOAD</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8 flex-1">
          <FileSelector selectedFile={selectedFile} onFileSelect={setSelectedFile} />
          <PasswordDisplay 
            password={generatedPassword}
            onRegeneratePassword={generateSecurePassword}
            onCopyPassword={copyPasswordToClipboard}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-8">
          <Button
            onClick={handleEncryptAndUpload}
            disabled={!selectedFile || isEncrypting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
          >
            {isEncrypting ? (
              <>
                <Lock className="w-5 h-5 mr-3 animate-spin" />
                ENCRYPTING...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-3" />
                ENCRYPT & DEPLOY
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-lg py-6 px-8"
          >
            ABORT
          </Button>
        </div>
      </div>
    </div>
  );
};
