import React, { useState, useRef } from 'react';
import { X, Type, Image, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createTextStatus, createImageStatus } from '@/services/statusService';
import { toast } from '@/hooks/use-toast';

interface StatusCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const BACKGROUND_COLORS = [
  '#1f2937', // gray-800
  '#059669', // emerald-600
  '#7c3aed', // violet-600
  '#db2777', // pink-600
  '#ea580c', // orange-600
  '#2563eb', // blue-600
  '#dc2626', // red-600
  '#0891b2', // cyan-600
];

export const StatusCreator = ({ isOpen, onClose, onCreated }: StatusCreatorProps) => {
  const [mode, setMode] = useState<'select' | 'text' | 'image'>('select');
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive'
      });
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setMode('image');
  };

  const handleSubmitText = async () => {
    if (!textContent.trim()) {
      toast({
        title: 'Empty status',
        description: 'Please enter some text for your status',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const status = await createTextStatus(textContent.trim(), backgroundColor);
      if (status) {
        toast({
          title: 'Status posted',
          description: 'Your status will be visible for 24 hours'
        });
        onCreated();
        handleClose();
      } else {
        throw new Error('Failed to create status');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post status. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitImage = async () => {
    if (!selectedImage) {
      toast({
        title: 'No image selected',
        description: 'Please select an image for your status',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const status = await createImageStatus(selectedImage);
      if (status) {
        toast({
          title: 'Status posted',
          description: 'Your status will be visible for 24 hours'
        });
        onCreated();
        handleClose();
      } else {
        throw new Error('Failed to create status');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post status. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('select');
    setTextContent('');
    setBackgroundColor(BACKGROUND_COLORS[0]);
    setSelectedImage(null);
    setImagePreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-white font-semibold">Create Status</h2>
        <button
          onClick={handleClose}
          className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {mode === 'select' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex space-x-6">
              <button
                onClick={() => setMode('text')}
                className="flex flex-col items-center space-y-3 p-6 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-colors"
              >
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Type className="w-8 h-8 text-green-400" />
                </div>
                <span className="text-white font-medium">Text</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center space-y-3 p-6 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-colors"
              >
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Image className="w-8 h-8 text-purple-400" />
                </div>
                <span className="text-white font-medium">Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {mode === 'text' && (
          <div className="flex-1 flex flex-col">
            {/* Preview area */}
            <div
              className="flex-1 flex items-center justify-center p-8"
              style={{ backgroundColor }}
            >
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your status..."
                className="bg-transparent border-none text-white text-2xl md:text-4xl font-medium text-center resize-none focus:ring-0 focus:outline-none placeholder:text-white/50"
                style={{ maxWidth: '600px' }}
                autoFocus
              />
            </div>

            {/* Color picker */}
            <div className="p-4 border-t border-gray-700 bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  {BACKGROUND_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBackgroundColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        backgroundColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleSubmitText}
                  disabled={loading || !textContent.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === 'image' && (
          <div className="flex-1 flex flex-col">
            {/* Image preview */}
            <div className="flex-1 flex items-center justify-center bg-black">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-700 bg-gray-900">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode('select');
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="text-gray-300 border-gray-600"
                >
                  Change Photo
                </Button>

                <Button
                  onClick={handleSubmitImage}
                  disabled={loading || !selectedImage}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
