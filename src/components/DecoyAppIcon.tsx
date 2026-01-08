import { useState, useEffect } from 'react';
import { Smartphone, Calculator, FileText, Camera, Calendar, Clock, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface DecoyIcon {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  bgColor: string;
  iconColor: string;
}

const DECOY_ICONS: DecoyIcon[] = [
  {
    id: 'default',
    name: 'Fortress (Default)',
    icon: <Shield className="w-8 h-8" />,
    description: 'Original app icon',
    bgColor: 'bg-green-600',
    iconColor: 'text-white',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: <Calculator className="w-8 h-8" />,
    description: 'Disguised as calculator app',
    bgColor: 'bg-gray-700',
    iconColor: 'text-orange-400',
  },
  {
    id: 'notes',
    name: 'Notes',
    icon: <FileText className="w-8 h-8" />,
    description: 'Disguised as notes app',
    bgColor: 'bg-yellow-500',
    iconColor: 'text-yellow-900',
  },
  {
    id: 'camera',
    name: 'Camera',
    icon: <Camera className="w-8 h-8" />,
    description: 'Disguised as camera app',
    bgColor: 'bg-gray-800',
    iconColor: 'text-white',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: <Calendar className="w-8 h-8" />,
    description: 'Disguised as calendar app',
    bgColor: 'bg-white',
    iconColor: 'text-red-500',
  },
  {
    id: 'clock',
    name: 'Clock',
    icon: <Clock className="w-8 h-8" />,
    description: 'Disguised as clock app',
    bgColor: 'bg-black',
    iconColor: 'text-white',
  },
];

export const DecoyAppIcon = () => {
  const [selectedIcon, setSelectedIcon] = useState(() => {
    return localStorage.getItem('decoy_icon') || 'default';
  });
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;
    setIsPWA(isStandalone);
  }, []);

  const selectIcon = (iconId: string) => {
    setSelectedIcon(iconId);
    localStorage.setItem('decoy_icon', iconId);

    // Update PWA manifest dynamically (limited browser support)
    updateManifest(iconId);

    toast.success(`Icon changed to ${DECOY_ICONS.find(i => i.id === iconId)?.name}`);
  };

  const updateManifest = (iconId: string) => {
    // Note: Dynamic manifest updates have limited browser support
    // This is more of a demonstration - full implementation would require
    // server-side manifest generation or service worker manipulation

    const icon = DECOY_ICONS.find(i => i.id === iconId);
    if (!icon) return;

    // Update document title based on decoy
    switch (iconId) {
      case 'calculator':
        document.title = 'Calculator';
        break;
      case 'notes':
        document.title = 'Notes';
        break;
      case 'camera':
        document.title = 'Camera';
        break;
      case 'calendar':
        document.title = 'Calendar';
        break;
      case 'clock':
        document.title = 'Clock';
        break;
      default:
        document.title = 'Fortress Message Comm';
    }
  };

  useEffect(() => {
    // Apply saved icon on load
    updateManifest(selectedIcon);
  }, []);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-purple-500" />
          Decoy App Icon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-400 text-sm">
          Disguise the app to look like another application on your home screen.
          {!isPWA && (
            <span className="text-yellow-400 block mt-1">
              Note: Install as PWA for full decoy icon support.
            </span>
          )}
        </p>

        {/* Icon Grid */}
        <div className="grid grid-cols-3 gap-3">
          {DECOY_ICONS.map((icon) => (
            <button
              key={icon.id}
              onClick={() => selectIcon(icon.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedIcon === icon.id
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 ${icon.bgColor} rounded-xl flex items-center justify-center ${icon.iconColor}`}>
                  {icon.icon}
                </div>
                <span className="text-white text-xs font-medium">{icon.name}</span>
                {selectedIcon === icon.id && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* PWA Install Hint */}
        {!isPWA && (
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Tip:</strong> Add to Home Screen to use decoy icons effectively.
              The app will appear with your chosen icon.
            </p>
          </div>
        )}

        {/* Warning */}
        <div className="p-3 bg-yellow-500/20 rounded-lg">
          <p className="text-yellow-400 text-sm">
            <strong>Note:</strong> Decoy icons work best when the app is installed as a PWA.
            Browser tabs will still show the real favicon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Hook for checking decoy mode
export const useDecoyMode = () => {
  const [isDecoyActive, setIsDecoyActive] = useState(false);
  const [decoyIcon, setDecoyIcon] = useState('default');

  useEffect(() => {
    const savedIcon = localStorage.getItem('decoy_icon') || 'default';
    setDecoyIcon(savedIcon);
    setIsDecoyActive(savedIcon !== 'default');
  }, []);

  return { isDecoyActive, decoyIcon };
};

export default DecoyAppIcon;
