import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Maximize2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CallState {
  isInCall: boolean;
  isVideo: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOff: boolean;
  callDuration: number;
  remoteUser: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
}

interface VoiceVideoCallProps {
  conversationId: string;
  remoteName: string;
  remoteAvatar?: string;
  remoteId: string;
}

export const VoiceVideoCall = ({ conversationId, remoteName, remoteAvatar, remoteId }: VoiceVideoCallProps) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isVideo: false,
    isMuted: false,
    isVideoOff: false,
    isSpeakerOff: false,
    callDuration: 0,
    remoteUser: null,
  });
  const [incomingCall, setIncomingCall] = useState<{ from: string; fromName: string; isVideo: boolean } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !conversationId) return;

    // Listen for incoming calls
    const callRef = doc(db, 'calls', `${conversationId}_${user.uid}`);
    const unsubscribe = onSnapshot(callRef, (snapshot) => {
      const data = snapshot.data();
      if (data && data.status === 'ringing' && data.from !== user.uid) {
        setIncomingCall({
          from: data.from,
          fromName: data.fromName,
          isVideo: data.isVideo,
        });
      }
    });

    return () => {
      unsubscribe();
      endCall();
    };
  }, [user, conversationId]);

  const startCall = async (isVideo: boolean) => {
    if (!user) return;

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });

      localStreamRef.current = stream;

      if (isVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create call document
      const callRef = doc(db, 'calls', `${conversationId}_${remoteId}`);
      await setDoc(callRef, {
        conversationId,
        from: user.uid,
        fromName: user.displayName || user.email,
        to: remoteId,
        isVideo,
        status: 'ringing',
        startedAt: serverTimestamp(),
      });

      setCallState({
        isInCall: true,
        isVideo,
        isMuted: false,
        isVideoOff: false,
        isSpeakerOff: false,
        callDuration: 0,
        remoteUser: {
          id: remoteId,
          name: remoteName,
          avatar: remoteAvatar,
        },
      });

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
      }, 1000);

      toast.success(`${isVideo ? 'Video' : 'Voice'} call started`);
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast.error('Please allow microphone/camera access');
      } else {
        toast.error('Failed to start call');
      }
      console.error('Call error:', error);
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.isVideo,
      });

      localStreamRef.current = stream;

      if (incomingCall.isVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Update call status
      const callRef = doc(db, 'calls', `${conversationId}_${user.uid}`);
      await setDoc(callRef, { status: 'connected' }, { merge: true });

      setCallState({
        isInCall: true,
        isVideo: incomingCall.isVideo,
        isMuted: false,
        isVideoOff: false,
        isSpeakerOff: false,
        callDuration: 0,
        remoteUser: {
          id: incomingCall.from,
          name: incomingCall.fromName,
        },
      });

      setIncomingCall(null);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
      }, 1000);

      toast.success('Call connected');
    } catch (error) {
      toast.error('Failed to answer call');
    }
  };

  const declineCall = async () => {
    if (!user) return;

    const callRef = doc(db, 'calls', `${conversationId}_${user.uid}`);
    await deleteDoc(callRef);
    setIncomingCall(null);
    toast.info('Call declined');
  };

  const endCall = async () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Clear duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Delete call document
    if (user && conversationId) {
      const callRef = doc(db, 'calls', `${conversationId}_${remoteId}`);
      await deleteDoc(callRef).catch(() => {});
    }

    setCallState({
      isInCall: false,
      isVideo: false,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOff: false,
      callDuration: 0,
      remoteUser: null,
    });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = callState.isMuted;
        setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = callState.isVideoOff;
        setCallState(prev => ({ ...prev, isVideoOff: !prev.isVideoOff }));
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Incoming call UI
  if (incomingCall) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <Card className="w-full max-w-sm bg-gray-800 border-gray-700">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
              {incomingCall.isVideo ? (
                <Video className="w-10 h-10 text-green-500" />
              ) : (
                <Phone className="w-10 h-10 text-green-500" />
              )}
            </div>
            <div>
              <p className="text-white text-lg font-medium">{incomingCall.fromName}</p>
              <p className="text-gray-400">Incoming {incomingCall.isVideo ? 'video' : 'voice'} call</p>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                onClick={declineCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button
                onClick={answerCall}
                className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700"
              >
                <Phone className="w-6 h-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // In-call UI
  if (callState.isInCall) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
        {/* Video area */}
        <div className="flex-1 relative bg-black">
          {callState.isVideo ? (
            <>
              {/* Remote video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Local video (PIP) */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute bottom-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-gray-700 ${
                  callState.isVideoOff ? 'hidden' : ''
                }`}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Avatar className="w-32 h-32 mx-auto mb-4">
                  <AvatarImage src={callState.remoteUser?.avatar} />
                  <AvatarFallback className="bg-gray-700 text-white text-4xl">
                    {callState.remoteUser?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white text-xl font-medium">{callState.remoteUser?.name}</p>
                <p className="text-green-400 mt-2">{formatDuration(callState.callDuration)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-6">
          <div className="flex justify-center gap-4">
            <Button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full ${
                callState.isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            {callState.isVideo && (
              <Button
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full ${
                  callState.isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {callState.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>
            )}

            <Button
              onClick={() => setCallState(prev => ({ ...prev, isSpeakerOff: !prev.isSpeakerOff }))}
              className={`w-14 h-14 rounded-full ${
                callState.isSpeakerOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {callState.isSpeakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </Button>

            <Button
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Call buttons (not in call)
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => startCall(false)}
        variant="ghost"
        size="sm"
        className="text-gray-400 hover:text-green-400 hover:bg-green-500/20"
      >
        <Phone className="w-4 h-4" />
      </Button>
      <Button
        onClick={() => startCall(true)}
        variant="ghost"
        size="sm"
        className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/20"
      >
        <Video className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default VoiceVideoCall;
