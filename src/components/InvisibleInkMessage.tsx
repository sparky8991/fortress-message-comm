import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InvisibleInkMessageProps {
  content: string;
  isOwn?: boolean;
  revealOnHold?: boolean;
  revealDuration?: number; // ms to keep revealed
}

export const InvisibleInkMessage = ({
  content,
  isOwn = false,
  revealOnHold = true,
  revealDuration = 3000,
}: InvisibleInkMessageProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  const handlePointerDown = () => {
    if (!revealOnHold) return;

    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      setIsRevealed(true);
      setIsHolding(false);

      // Auto-hide after duration
      autoHideTimerRef.current = setTimeout(() => {
        setIsRevealed(false);
      }, revealDuration);
    }, 500); // Hold for 500ms to reveal
  };

  const handlePointerUp = () => {
    setIsHolding(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
  };

  const toggleReveal = () => {
    if (!revealOnHold) {
      setIsRevealed(!isRevealed);

      if (!isRevealed) {
        // Auto-hide after duration
        autoHideTimerRef.current = setTimeout(() => {
          setIsRevealed(false);
        }, revealDuration);
      }
    }
  };

  return (
    <div
      className={cn(
        'relative group cursor-pointer select-none',
        'transition-all duration-300',
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={toggleReveal}
    >
      {/* Message Container */}
      <div
        className={cn(
          'p-3 rounded-lg relative overflow-hidden',
          isOwn ? 'bg-green-600' : 'bg-gray-700',
        )}
      >
        {/* Invisible Ink Effect */}
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            isRevealed ? 'opacity-0' : 'opacity-100',
          )}
          style={{
            background: isOwn
              ? 'repeating-linear-gradient(45deg, rgba(34, 197, 94, 0.9), rgba(34, 197, 94, 0.9) 2px, rgba(22, 163, 74, 0.9) 2px, rgba(22, 163, 74, 0.9) 4px)'
              : 'repeating-linear-gradient(45deg, rgba(55, 65, 81, 0.9), rgba(55, 65, 81, 0.9) 2px, rgba(75, 85, 99, 0.9) 2px, rgba(75, 85, 99, 0.9) 4px)',
          }}
        />

        {/* Sparkle Animation when holding */}
        {isHolding && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
        )}

        {/* Reveal Hint */}
        {!isRevealed && !isHolding && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-white/80">
              <Eye className="w-4 h-4" />
              <span className="ft-body">Hold to reveal</span>
            </div>
          </div>
        )}

        {/* Actual Content */}
        <p
          className={cn(
            'text-white transition-opacity duration-500',
            isRevealed ? 'opacity-100' : 'opacity-0',
          )}
        >
          {content}
        </p>
      </div>

      {/* Invisible Ink Label */}
      <div className="flex items-center gap-1 mt-1 ft-meta text-gray-500">
        <Sparkles className="w-3 h-3" />
        <span>Invisible Ink</span>
      </div>
    </div>
  );
};

// Toggle button for message input
interface InvisibleInkToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export const InvisibleInkToggle = ({ enabled, onToggle }: InvisibleInkToggleProps) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn(
        'h-8 w-8 p-0',
        enabled ? 'text-purple-400 bg-purple-500/20' : 'text-gray-400 hover:text-purple-400',
      )}
      title="Invisible Ink"
    >
      {enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </Button>
  );
};

// Hook for managing invisible ink state
export const useInvisibleInk = () => {
  const [isInvisibleInkEnabled, setIsInvisibleInkEnabled] = useState(false);

  const toggleInvisibleInk = () => {
    setIsInvisibleInkEnabled(!isInvisibleInkEnabled);
  };

  const sendInvisibleInkMessage = (content: string) => {
    return {
      content,
      isInvisibleInk: true,
      revealDuration: 3000,
    };
  };

  return {
    isInvisibleInkEnabled,
    toggleInvisibleInk,
    sendInvisibleInkMessage,
    setIsInvisibleInkEnabled,
  };
};

// Scratch reveal variant
export const ScratchRevealMessage = ({ content }: { content: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchPercentage, setScratchPercentage] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with scratch-off coating
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add texture
    ctx.fillStyle = '#4B5563';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillRect(x, y, 2, 2);
    }
  }, []);

  const handleScratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    // Erase in circular pattern
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Calculate scratch percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const percentage = (transparent / (imageData.data.length / 4)) * 100;
    setScratchPercentage(percentage);

    if (percentage > 50 && !isRevealed) {
      setIsRevealed(true);
    }
  };

  return (
    <div className="relative inline-block">
      <div className="p-3 bg-gray-700 rounded-lg">
        <p className="text-white">{content}</p>
      </div>

      {!isRevealed && (
        <canvas
          ref={canvasRef}
          width={200}
          height={60}
          className="absolute inset-0 cursor-crosshair rounded-lg"
          onMouseMove={(e) => e.buttons === 1 && handleScratch(e)}
          onTouchMove={handleScratch}
        />
      )}

      {!isRevealed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-gray-400 ft-body">Scratch to reveal</span>
        </div>
      )}
    </div>
  );
};

export default InvisibleInkMessage;
