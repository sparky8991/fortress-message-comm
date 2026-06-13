
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

interface TenorGif {
  id: string;
  content_description?: string;
  media_formats?: {
    gif?: { url?: string };
    mediumgif?: { url?: string };
    tinygif?: { url?: string };
    nanogif?: { url?: string };
  };
}

// Using Tenor API (Google's GIF API) - free tier
const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY as string | undefined;

export const GifPicker = ({ isOpen, onClose, onGifSelect }: GifPickerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const searchGifs = useCallback(async (query: string) => {
    if (!TENOR_API_KEY) {
      console.error('Tenor API key is not configured.');
      setGifs([]);
      return;
    }

    setLoading(true);
    try {
      const endpoint = query
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=30&media_filter=gif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=30&media_filter=gif`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Tenor request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.results) {
        const formattedGifs: GifResult[] = data.results
          .map((gif: TenorGif) => {
            const url = gif.media_formats?.gif?.url || gif.media_formats?.mediumgif?.url || '';
            return {
              id: gif.id,
              url,
              preview: gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url || url,
              title: gif.content_description || 'GIF'
            };
          })
          .filter((gif: GifResult) => gif.url && gif.preview);
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
    <div className="absolute bottom-full right-0 z-[70] mb-2 w-80 overflow-hidden rounded-sm border border-[#1E5C3C] bg-[#0C120F] font-mono text-[#DCEAE1] shadow-[0_0_35px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-[#1C2B22] p-3">
        <div className="flex items-center space-x-2">
          <ImageIcon className="h-4 w-4 text-[#36E27B]" />
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#ECF7F0]">GIF Library</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="fortress-focus p-1 text-[#76897D] transition-colors hover:bg-[#36E27B]/10 hover:text-[#DCEAE1]"
          aria-label="Close GIF picker"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-[#1C2B22] p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#4A5A50]" />
          <Input
            placeholder="SEARCH GIFS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 rounded-sm border-[#1C2B22] bg-[#070B09] pl-8 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]"
          />
        </div>
      </div>

      <ScrollArea className="h-64">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-[#36E27B]" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-[#76897D]">
            <ImageIcon className="mb-2 h-8 w-8 opacity-45" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em]">
              {TENOR_API_KEY ? 'No GIFs found' : 'Tenor key not configured'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 p-2">
            {gifs.map((gif) => (
              <button
                type="button"
                key={gif.id}
                onClick={() => handleGifClick(gif)}
                className="fortress-focus relative aspect-video overflow-hidden rounded-sm border border-[#1C2B22] bg-[#070B09] transition-all hover:border-[#36E27B]"
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

      <div className="border-t border-[#1C2B22] p-2 text-center">
        <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-[#4A5A50]">Powered by Tenor</span>
      </div>
    </div>
  );
};
