import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, StopCircle, Loader2, AlertTriangle } from 'lucide-react';
import { auth, db } from '@/integrations/firebase/client';
import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: any;
  expiresAt: any;
  userName: string;
}

interface LocationSharingProps {
  conversationId: string;
  userName?: string;
}

const DURATION_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '1 hour', value: 60 },
  { label: '4 hours', value: 240 },
  { label: '8 hours', value: 480 },
];

export const LocationSharing = ({ conversationId, userName = 'User' }: LocationSharingProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [duration, setDuration] = useState<number>(15);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user || !conversationId) return;

    // Check if already sharing
    const locationRef = doc(db, 'location_sharing', `${conversationId}_${user.uid}`);
    const unsubscribe = onSnapshot(locationRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const expiresAt = data.expiresAt?.toMillis?.() || 0;
        setIsSharing(Date.now() < expiresAt);
      } else {
        setIsSharing(false);
      }
    });

    return () => unsubscribe();
  }, [conversationId, user?.uid]);

  const startSharing = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Request location permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const expiresAt = new Date(Date.now() + duration * 60 * 1000);
      const locationRef = doc(db, 'location_sharing', `${conversationId}_${user.uid}`);

      await setDoc(locationRef, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: serverTimestamp(),
        expiresAt: expiresAt,
        userName: userName,
        conversationId: conversationId
      });

      setIsSharing(true);
      setShowDialog(false);

      // Start continuous updates
      startLocationUpdates();

    } catch (err: any) {
      if (err.code === 1) {
        setError('Location permission denied. Please enable location access.');
      } else {
        setError('Could not get your location. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startLocationUpdates = () => {
    if (!user) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const locationRef = doc(db, 'location_sharing', `${conversationId}_${user.uid}`);
        await setDoc(locationRef, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: serverTimestamp()
        }, { merge: true });
      },
      (error) => console.error('Location update error:', error),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    // Store watch ID to clear later
    localStorage.setItem(`location_watch_${conversationId}`, watchId.toString());
  };

  const stopSharing = async () => {
    if (!user) return;

    try {
      const locationRef = doc(db, 'location_sharing', `${conversationId}_${user.uid}`);
      await deleteDoc(locationRef);

      // Clear location watch
      const watchId = localStorage.getItem(`location_watch_${conversationId}`);
      if (watchId) {
        navigator.geolocation.clearWatch(parseInt(watchId));
        localStorage.removeItem(`location_watch_${conversationId}`);
      }

      setIsSharing(false);
    } catch (error) {
      console.error('Error stopping location sharing:', error);
    }
  };

  return (
    <>
      {isSharing ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={stopSharing}
          className="text-red-400 hover:text-red-300 hover:bg-red-600/20"
        >
          <StopCircle className="w-4 h-4 mr-1" />
          Stop Sharing
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDialog(true)}
          className="text-green-400 hover:text-green-300 hover:bg-green-600/20"
        >
          <MapPin className="w-4 h-4 mr-1" />
          Share Location
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              Share Live Location
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Share your real-time location with this conversation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block ft-body text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Share for
              </label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 ft-body p-3 bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="ft-meta text-gray-500 space-y-1">
              <p>Your location will be updated in real-time while sharing is active.</p>
              <p>You can stop sharing at any time.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={startSharing}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Navigation className="w-4 h-4 mr-2" />
              )}
              Start Sharing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Component to display shared location
interface SharedLocationViewProps {
  conversationId: string;
  excludeUserId?: string;
}

export const SharedLocationView = ({ conversationId, excludeUserId }: SharedLocationViewProps) => {
  const [locations, setLocations] = useState<Map<string, LocationData>>(new Map());

  useEffect(() => {
    // This would need a query to get all locations for this conversation
    // For simplicity, we'll just show a placeholder
  }, [conversationId]);

  if (locations.size === 0) return null;

  return (
    <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
      <div className="flex items-center gap-2 text-green-400 ft-body mb-2">
        <MapPin className="w-4 h-4" />
        <span>Live Locations</span>
      </div>
      {Array.from(locations.entries()).map(([id, loc]) => (
        <div key={id} className="flex items-center justify-between ft-body py-1">
          <span className="text-gray-300">{loc.userName}</span>
          <a
            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 ft-meta"
          >
            View on Map
          </a>
        </div>
      ))}
    </div>
  );
};
