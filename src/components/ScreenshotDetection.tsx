import { useState, useEffect, useCallback } from 'react';
import { Camera, AlertTriangle, Eye, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

interface ScreenshotAlert {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

interface ScreenshotDetectionProps {
  conversationId: string;
  enabled?: boolean;
  onScreenshotDetected?: () => void;
}

export const useScreenshotDetection = (conversationId: string, enabled: boolean = true) => {
  const { user } = useAuth();
  const [screenshotAlerts, setScreenshotAlerts] = useState<ScreenshotAlert[]>([]);

  // Log screenshot event
  const logScreenshot = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      await addDoc(collection(db, 'screenshot_logs'), {
        conversationId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Unknown',
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to log screenshot:', error);
    }
  }, [user, conversationId]);

  // Detect screenshots using visibility API and keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    // Detect Print Screen key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4'))) {
        logScreenshot();
        toast.warning('Screenshot detected!', {
          icon: <Camera className="w-4 h-4" />,
        });
      }
    };

    // Detect visibility changes (might indicate screenshot on mobile)
    const handleVisibilityChange = () => {
      // This is a heuristic - quick visibility changes might indicate screenshot
      // Not reliable but adds a layer of detection
    };

    // Detect iOS screenshot (document becomes hidden briefly)
    let lastHiddenTime = 0;
    const handleVisibilityForScreenshot = () => {
      if (document.hidden) {
        lastHiddenTime = Date.now();
      } else {
        const hiddenDuration = Date.now() - lastHiddenTime;
        // iOS screenshots cause a very brief visibility change
        if (hiddenDuration > 0 && hiddenDuration < 500) {
          logScreenshot();
          toast.warning('Possible screenshot detected!', {
            icon: <Camera className="w-4 h-4" />,
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityForScreenshot);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityForScreenshot);
    };
  }, [enabled, logScreenshot]);

  // Listen for screenshot alerts from others
  useEffect(() => {
    if (!conversationId || !user) return;

    const q = query(
      collection(db, 'screenshot_logs'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as ScreenshotAlert[];

      // Check for new screenshots from others
      const latestAlert = alerts[0];
      if (latestAlert && latestAlert.userId !== user.uid) {
        const isRecent = latestAlert.timestamp &&
          (Date.now() - latestAlert.timestamp.getTime()) < 5000;

        if (isRecent) {
          toast.error(`${latestAlert.userName} took a screenshot!`, {
            icon: <AlertTriangle className="w-4 h-4" />,
            duration: 5000,
          });
        }
      }

      setScreenshotAlerts(alerts);
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  return { screenshotAlerts, logScreenshot };
};

// Visual indicator component
export const ScreenshotProtectionBadge = ({ enabled }: { enabled: boolean }) => (
  <div className={`flex items-center gap-1 px-2 py-1 rounded ft-meta ${
    enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
  }`}>
    <Shield className="w-3 h-3" />
    <span>Screenshot {enabled ? 'Protected' : 'Detection Off'}</span>
  </div>
);

// Screenshot alert notification component
export const ScreenshotAlertBanner = ({ alert }: { alert: ScreenshotAlert }) => (
  <div className="flex items-center gap-2 p-2 bg-red-500/20 rounded-lg text-red-400 ft-body">
    <Camera className="w-4 h-4" />
    <span>
      <strong>{alert.userName}</strong> took a screenshot
      {alert.timestamp && (
        <span className="text-red-400/60 ml-1">
          • {alert.timestamp.toLocaleTimeString()}
        </span>
      )}
    </span>
  </div>
);

// Settings component for screenshot detection
export const ScreenshotDetectionSettings = () => {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('screenshot_detection') !== 'false';
  });

  const toggleDetection = () => {
    const newState = !enabled;
    localStorage.setItem('screenshot_detection', newState.toString());
    setEnabled(newState);
    toast.success(`Screenshot detection ${newState ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Camera className="w-5 h-5 text-orange-500" />
        <div>
          <p className="text-white ft-body font-medium">Screenshot Detection</p>
          <p className="text-gray-400 ft-meta">Alert when screenshots are taken</p>
        </div>
      </div>
      <button
        onClick={toggleDetection}
        className={`w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-green-500' : 'bg-gray-600'
        }`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
};

export default ScreenshotDetectionSettings;
