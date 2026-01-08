
import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onGifSelect: (gifUrl: string) => void;
}

interface GifResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

// Using Tenor API (Google's GIF API) - free tier
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public API key for Tenor

export const GifPicker = ({ isOpen, onClose, onGifSelect }: GifPickerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const searchGifs = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const endpoint = query
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=30&media_filter=gif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=30&media_filter=gif`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.results) {
        const formattedGifs: GifResult[] = data.results.map((gif: any) => ({
          id: gif.id,
          url: gif.media_formats?.gif?.url || gif.media_formats?.mediumgif?.url || '',
          preview: gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url || '',
          title: gif.content_description || 'GIF'
        }));
        setGifs(formattedGifs);
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending GIFs when opened
  useEffect(() => {
    if (isOpen && !trendingLoaded) {
      searchGifs('');
      setTrendingLoaded(true);
    }
  }, [isOpen, trendingLoaded, searchGifs]);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      if (isOpen) searchGifs('');
      return;
    }

    const timeoutId = setTimeout(() => {
      searchGifs(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isOpen, searchGifs]);

  const handleGifClick = (gif: GifResult) => {
    onGifSelect(gif.url);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">GIFs</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search GIFs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-gray-700 border-gray-600 text-white text-sm"
          />
        </div>
      </div>

      {/* GIF Grid */}
      <ScrollArea className="h-64">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">No GIFs found</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 p-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleGifClick(gif)}
                className="relative aspect-video bg-gray-700 rounded overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Powered by Tenor */}
      <div className="p-2 border-t border-gray-700 text-center">
        <span className="text-xs text-gray-500">Powered by Tenor</span>
      </div>
    </div>
  );
};
