import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, X, Send, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    // Store waveform snapshot for playback visualization
    const snapshot = Array.from(dataArray).filter((_, i) => i % 4 === 0).map(v => v / 255);
    setWaveformData(prev => [...prev.slice(-100), ...snapshot.slice(0, 5)]);

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Draw glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#22c55e';
    ctx.stroke();

    animationRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setWaveformData([]);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start visualization
      drawWaveform();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      // Stop all tracks
      streamRef.current?.getTracks().forEach(track => track.stop());

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Stop animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Close audio context
      audioContextRef.current?.close();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
        drawWaveform();
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      }
      setIsPaused(!isPaused);
    }
  };

  const handleCancel = () => {
    stopRecording();
    setAudioBlob(null);
    setDuration(0);
    setWaveformData([]);
    onCancel();
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration);
      setAudioBlob(null);
      setDuration(0);
      setWaveformData([]);
    }
  };

  useEffect(() => {
    // Auto-start recording when component mounts
    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 bg-gray-800 rounded-xl p-3 border border-green-500/30">
      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="h-10 w-10 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10"
      >
        <X className="w-5 h-5" />
      </Button>

      {/* Waveform visualization */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={200}
          height={40}
          className="w-full h-10 rounded-lg bg-gray-900"
        />

        {/* Recording indicator */}
        {isRecording && !isPaused && (
          <div className="absolute top-1 left-2 flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-red-400 font-medium">REC</span>
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="text-green-400 font-mono ft-body min-w-[48px] text-center">
        {formatDuration(duration)}
      </div>

      {/* Controls */}
      {isRecording ? (
        <div className="flex items-center space-x-2">
          {/* Pause/Resume */}
          <Button
            variant="ghost"
            size="icon"
            onClick={pauseRecording}
            className="h-10 w-10 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>

          {/* Stop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={stopRecording}
            className="h-10 w-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        </div>
      ) : audioBlob ? (
        /* Send button after recording */
        <Button
          size="icon"
          onClick={handleSend}
          className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-black"
        >
          <Send className="w-5 h-5" />
        </Button>
      ) : null}
    </div>
  );
};
