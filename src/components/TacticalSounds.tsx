import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface SoundPack {
  id: string;
  name: string;
  description: string;
  sounds: {
    notification: string;
    messageSent: string;
    messageReceived: string;
    call: string;
    alert: string;
  };
}

// Base64 encoded simple sounds (very short beeps for demo)
// In production, you'd use actual audio files
const BEEP_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6SgnRxe4WLi4N6dXl+g4ODfnp4e3+BgYF+fHp7foCAgH98fHt9f4CAfn18fH1/gIB/fnx8fX9/f359fHx9f4B/fn18fH1/f39+fXx8fX9/f359fHx9f39/fn18fH1/f39+fXx8fX9/f359fHx9f39/fn18fX5/f39+fXx9fn9/f359fH1+f39/fn19fX5/f39+fX19fn9/f359fX1+f39/fn19fX5/f39+fX19fn9/f359fX1+f39/fn19fX5/f39+fX19fn9/f359fX1+f39+fn19fX5/f35+fX19fn9/fn59fX1+f39+fn19fX5/f35+fX19fn9/fn59fX1+f39+fn19fX5/f35+fX19fn9/fn59fX1+f39+fn19fX5/f35+fX19fn9/fn59fX1+';

const SOUND_PACKS: SoundPack[] = [
  {
    id: 'tactical',
    name: 'Tactical Ops',
    description: 'Military-style radio sounds',
    sounds: {
      notification: BEEP_SOUND,
      messageSent: BEEP_SOUND,
      messageReceived: BEEP_SOUND,
      call: BEEP_SOUND,
      alert: BEEP_SOUND,
    },
  },
  {
    id: 'stealth',
    name: 'Stealth Mode',
    description: 'Subtle, quiet notifications',
    sounds: {
      notification: BEEP_SOUND,
      messageSent: BEEP_SOUND,
      messageReceived: BEEP_SOUND,
      call: BEEP_SOUND,
      alert: BEEP_SOUND,
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Standard notification sounds',
    sounds: {
      notification: BEEP_SOUND,
      messageSent: BEEP_SOUND,
      messageReceived: BEEP_SOUND,
      call: BEEP_SOUND,
      alert: BEEP_SOUND,
    },
  },
  {
    id: 'silent',
    name: 'Silent',
    description: 'No sounds at all',
    sounds: {
      notification: '',
      messageSent: '',
      messageReceived: '',
      call: '',
      alert: '',
    },
  },
];

interface SoundSettings {
  enabled: boolean;
  volume: number;
  packId: string;
}

// Sound manager hook
export const useSounds = () => {
  const [settings, setSettings] = useState<SoundSettings>(() => {
    const saved = localStorage.getItem('sound_settings');
    return saved ? JSON.parse(saved) : { enabled: true, volume: 0.5, packId: 'tactical' };
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('sound_settings', JSON.stringify(settings));
  }, [settings]);

  const playSound = (soundType: keyof SoundPack['sounds']) => {
    if (!settings.enabled) return;

    const pack = SOUND_PACKS.find(p => p.id === settings.packId);
    if (!pack || !pack.sounds[soundType]) return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(pack.sounds[soundType]);
      audio.volume = settings.volume;
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  };

  const updateSettings = (updates: Partial<SoundSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return {
    settings,
    updateSettings,
    playSound,
    playNotification: () => playSound('notification'),
    playMessageSent: () => playSound('messageSent'),
    playMessageReceived: () => playSound('messageReceived'),
    playCallSound: () => playSound('call'),
    playAlert: () => playSound('alert'),
  };
};

export const TacticalSounds = () => {
  const { settings, updateSettings, playSound } = useSounds();

  const previewSound = (packId: string) => {
    const pack = SOUND_PACKS.find(p => p.id === packId);
    if (pack && pack.sounds.notification) {
      try {
        const audio = new Audio(pack.sounds.notification);
        audio.volume = settings.volume;
        audio.play().catch(() => {});
      } catch (error) {
        console.error('Failed to preview sound:', error);
      }
    }
  };

  const selectPack = (packId: string) => {
    updateSettings({ packId });
    previewSound(packId);
    toast.success(`Sound pack changed to ${SOUND_PACKS.find(p => p.id === packId)?.name}`);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-cyan-500" />
          Tactical Sounds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <Volume2 className="w-5 h-5 text-green-500" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
            <span className="text-white">Sound Effects</span>
          </div>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`w-12 h-6 rounded-full transition-colors ${
              settings.enabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Volume Slider */}
        {settings.enabled && (
          <div className="p-3 bg-gray-700/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 ft-body">Volume</span>
              <span className="text-white ft-body">{Math.round(settings.volume * 100)}%</span>
            </div>
            <Slider
              value={[settings.volume * 100]}
              onValueChange={([value]) => updateSettings({ volume: value / 100 })}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Sound Packs */}
        {settings.enabled && (
          <div className="space-y-2">
            <p className="text-gray-400 ft-body">Sound Pack</p>
            {SOUND_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => selectPack(pack.id)}
                className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                  settings.packId === pack.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-left">
                  <p className="text-white font-medium">{pack.name}</p>
                  <p className="text-gray-400 ft-meta">{pack.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {pack.id !== 'silent' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        previewSound(pack.id);
                      }}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  {settings.packId === pack.id && (
                    <Check className="w-5 h-5 text-cyan-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TacticalSounds;
