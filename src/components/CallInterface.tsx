
import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, Shield } from 'lucide-react';

interface CallInterfaceProps {
  callType: 'voice' | 'video';
  onEndCall: () => void;
  contactName: string;
}

export const CallInterface = ({ callType, onEndCall, contactName }: CallInterfaceProps) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
      {/* Video Area */}
      {callType === 'video' && (
        <div className="relative w-full max-w-4xl aspect-video bg-gray-800 rounded-2xl mb-8 overflow-hidden">
          {/* Main Video */}
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            {!isVideoOff ? (
              <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                AJ
              </div>
            ) : (
              <div className="text-gray-400 text-center">
                <VideoOff className="w-16 h-16 mx-auto mb-4" />
                <p>Video is turned off</p>
              </div>
            )}
          </div>
          
          {/* Picture in Picture */}
          <div className="absolute top-4 right-4 w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600">
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-white text-sm font-bold">You</span>
            </div>
          </div>
          
          {/* Encryption Indicator */}
          <div className="absolute top-4 left-4 bg-green-500 bg-opacity-90 px-3 py-1 rounded-full flex items-center space-x-2">
            <Shield className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">Encrypted</span>
          </div>
        </div>
      )}

      {/* Voice Call Avatar */}
      {callType === 'voice' && (
        <div className="mb-8">
          <div className="w-48 h-48 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-6xl font-bold mb-6 animate-pulse">
            AJ
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="text-green-500 font-medium">Encrypted Voice Call</span>
          </div>
        </div>
      )}

      {/* Call Info */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">{contactName}</h2>
        <p className="text-green-500 text-lg mb-1">Connected</p>
        <p className="text-gray-400">{formatDuration(duration)}</p>
      </div>

      {/* Call Controls */}
      <div className="flex items-center space-x-6">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition-colors ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        {callType === 'video' && (
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-4 rounded-full transition-colors ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoOff ? (
              <VideoOff className="w-6 h-6 text-white" />
            ) : (
              <Video className="w-6 h-6 text-white" />
            )}
          </button>
        )}

        <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors">
          <Volume2 className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={onEndCall}
          className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-8 text-center">
        <p className="text-gray-400 text-sm">
          This call is protected with end-to-end encryption
        </p>
      </div>
    </div>
  );
};
