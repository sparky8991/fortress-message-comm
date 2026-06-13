
import React from 'react';
import { Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface FileSelectorProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
}

export const FileSelector = ({ selectedFile, onFileSelect }: FileSelectorProps) => {
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

    onFileSelect(file);
    toast({
      title: '✅ PAYLOAD LOADED',
      description: 'Image ready for military-grade encryption.',
    });
  };

  return (
    <div>
      <Label htmlFor="image-file" className="ft-body font-medium text-gray-300 mb-2 block">
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
        className="w-full justify-start bg-gray-700 border-gray-600 text-white hover:bg-gray-600 ft-body"
      >
        <Upload className="w-4 h-4 mr-2" />
        {selectedFile ? selectedFile.name : 'Choose Image File'}
      </Button>
    </div>
  );
};
