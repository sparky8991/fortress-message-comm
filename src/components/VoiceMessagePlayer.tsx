import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  isOwn?: boolean;
}

export const VoiceMessagePlayer = ({ audioUrl, duration, isOwn = false }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // Generate waveform data from audio file
  const generateWaveform = useCallback(async () => {
    try {
      const audioContext = new AudioContext();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const samples = 50;
      const blockSize = Math.floor(rawData.length / samples);
      const filteredData: number[] = [];

      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
      }

      // Normalize
      const maxVal = Math.max(...filteredData);
      const normalizedData = filteredData.map(n => n / maxVal);

      setWaveformData(normalizedData);
      setIsLoaded(true);
      audioContext.close();
    } catch (err) {
      console.error('Error generating waveform:', err);
      // Fallback: generate random waveform
      const fallbackData = Array.from({ length: 50 }, () => Math.random() * 0.8 + 0.2);
      setWaveformData(fallbackData);
      setIsLoaded(true);
    }
  }, [audioUrl]);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth * dpr;
    const height = canvas.offsetHeight * dpr;
    canvas.width = width;
    canvas.height = height;
    ctx.scale(dpr, dpr);

    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const barWidth = (displayWidth / waveformData.length) * 0.8;
    const gap = (displayWidth / waveformData.length) * 0.2;
    const progress = duration > 0 ? currentTime / duration : 0;

    waveformData.forEach((value, index) => {
      const x = index * (barWidth + gap);
      const barHeight = Math.max(value * displayHeight * 0.8, 2);
      const y = (displayHeight - barHeight) / 2;

      // Determine if this bar is "played"
      const barProgress = index / waveformData.length;
      const isPlayed = barProgress <= progress;

      // Color based on ownership and played state
      if (isOwn) {
        ctx.fillStyle = isPlayed ? '#22c55e' : '#166534';
      } else {
        ctx.fillStyle = isPlayed ? '#22c55e' : '#374151';
      }

      // Draw rounded bar
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    });
  }, [waveformData, currentTime, duration, isOwn]);

  useEffect(() => {
    generateWaveform();
  }, [generateWaveform]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center space-x-3 py-1 px-1 rounded-lg min-w-[200px] max-w-[280px] ${
      isOwn ? 'bg-green-900/20' : 'bg-gray-700/50'
    }`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlayback}
        disabled={!isLoaded}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isOwn
            ? 'bg-green-500 hover:bg-green-400 text-black'
            : 'bg-gray-600 hover:bg-gray-500 text-white'
        } ${!isLoaded ? 'opacity-50 cursor-wait' : ''}`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col space-y-1">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-8 cursor-pointer"
          style={{ width: '100%', height: '32px' }}
        />

        {/* Time and speed */}
        <div className="flex items-center justify-between text-[10px]">
          <span className={isOwn ? 'text-green-300' : 'text-gray-400'}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            onClick={cyclePlaybackRate}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              isOwn
                ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
