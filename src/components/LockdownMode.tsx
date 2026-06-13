import { useState, useEffect, createContext, useContext } from 'react';
import { Shield, Scan, Lock, Unlock, Eye, EyeOff, Fingerprint, KeyRound, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface LockdownContextType {
  isLockdownEnabled: boolean;
  isAuthenticated: boolean;
  authMethod: 'biometric' | 'pin' | null;
  requireAuth: () => Promise<boolean>;
  lockMessages: () => void;
  toggleLockdown: (enabled: boolean) => void;
}

const LockdownContext = createContext<LockdownContextType | null>(null);

export const useLockdown = () => {
  const context = useContext(LockdownContext);
  if (!context) {
    throw new Error('useLockdown must be used within LockdownProvider');
  }
  return context;
};

interface LockdownProviderProps {
  children: React.ReactNode;
}

export const LockdownProvider = ({ children }: LockdownProviderProps) => {
  const [isLockdownEnabled, setIsLockdownEnabled] = useState(() => {
    return localStorage.getItem('lockdown_enabled') === 'true';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMethod, setAuthMethod] = useState<'biometric' | 'pin' | null>(null);
  const [lastAuthTime, setLastAuthTime] = useState<number>(0);

  // Auto-lock after 5 minutes of inactivity
  useEffect(() => {
    if (!isLockdownEnabled || !isAuthenticated) return;

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastAuthTime > 5 * 60 * 1000) { // 5 minutes
        setIsAuthenticated(false);
        setAuthMethod(null);
      }
    };

    const interval = setInterval(checkInactivity, 30000);
    return () => clearInterval(interval);
  }, [isLockdownEnabled, isAuthenticated, lastAuthTime]);

  // Reset auth on visibility change (app backgrounded)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isLockdownEnabled) {
        // Lock after 30 seconds in background
        setTimeout(() => {
          if (document.hidden) {
            setIsAuthenticated(false);
            setAuthMethod(null);
          }
        }, 30000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLockdownEnabled]);

  const requireAuth = async (): Promise<boolean> => {
    if (!isLockdownEnabled) return true;
    if (isAuthenticated) {
      setLastAuthTime(Date.now());
      return true;
    }
    return false;
  };

  const lockMessages = () => {
    setIsAuthenticated(false);
    setAuthMethod(null);
  };

  const toggleLockdown = (enabled: boolean) => {
    setIsLockdownEnabled(enabled);
    localStorage.setItem('lockdown_enabled', enabled.toString());
    if (!enabled) {
      setIsAuthenticated(false);
      setAuthMethod(null);
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      // Check if WebAuthn is available
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

        if (available) {
          // Create challenge
          const challenge = new Uint8Array(32);
          crypto.getRandomValues(challenge);

          try {
            await navigator.credentials.get({
              publicKey: {
                challenge,
                timeout: 60000,
                userVerification: 'required',
                rpId: window.location.hostname,
              },
            });

            setIsAuthenticated(true);
            setAuthMethod('biometric');
            setLastAuthTime(Date.now());
            return true;
          } catch (error: any) {
            if (error.name === 'NotAllowedError') {
              return false;
            }
            throw error;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Biometric auth error:', error);
      return false;
    }
  };

  const authenticateWithPIN = (pin: string): boolean => {
    const storedPIN = localStorage.getItem('lockdown_pin');
    if (storedPIN && pin === storedPIN) {
      setIsAuthenticated(true);
      setAuthMethod('pin');
      setLastAuthTime(Date.now());
      return true;
    }
    return false;
  };

  return (
    <LockdownContext.Provider
      value={{
        isLockdownEnabled,
        isAuthenticated,
        authMethod,
        requireAuth,
        lockMessages,
        toggleLockdown,
      }}
    >
      {children}
      <LockdownContextInternal
        authenticateWithBiometric={authenticateWithBiometric}
        authenticateWithPIN={authenticateWithPIN}
      />
    </LockdownContext.Provider>
  );
};

// Internal component for auth UI
const LockdownContextInternal = ({
  authenticateWithBiometric,
  authenticateWithPIN,
}: {
  authenticateWithBiometric: () => Promise<boolean>;
  authenticateWithPIN: (pin: string) => boolean;
}) => {
  const { isLockdownEnabled, isAuthenticated } = useLockdown();

  if (!isLockdownEnabled || isAuthenticated) return null;

  return (
    <LockdownAuthScreen
      onBiometricAuth={authenticateWithBiometric}
      onPINAuth={authenticateWithPIN}
    />
  );
};

// Full-screen auth screen
interface LockdownAuthScreenProps {
  onBiometricAuth: () => Promise<boolean>;
  onPINAuth: (pin: string) => boolean;
}

const LockdownAuthScreen = ({ onBiometricAuth, onPINAuth }: LockdownAuthScreenProps) => {
  const [showPINInput, setShowPINInput] = useState(false);
  const [pin, setPIN] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => setLockoutTime(lockoutTime - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isLocked && lockoutTime === 0) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [lockoutTime, isLocked]);

  const handleBiometricAuth = async () => {
    if (isLocked) return;

    setIsAuthenticating(true);
    const success = await onBiometricAuth();
    setIsAuthenticating(false);

    if (success) {
      toast.success('Authentication successful');
    } else {
      setShowPINInput(true);
      toast.info('Biometric failed. Please use PIN.');
    }
  };

  const handlePINSubmit = () => {
    if (isLocked) return;

    const success = onPINAuth(pin);
    if (success) {
      toast.success('Authentication successful');
      setPIN('');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPIN('');

      if (newAttempts >= 5) {
        setIsLocked(true);
        setLockoutTime(60); // 60 second lockout
        toast.error('Too many attempts. Locked for 60 seconds.');
      } else {
        toast.error(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
      }
    }
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPIN(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPIN(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <CardTitle className="text-white ft-head">Lockdown Mode Active</CardTitle>
          <p className="text-gray-400 ft-body mt-2">
            Authenticate to view messages
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLocked ? (
            <div className="text-center p-4 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-400">Too many failed attempts</p>
              <p className="text-white ft-head font-mono mt-2">{lockoutTime}s</p>
            </div>
          ) : showPINInput ? (
            <>
              {/* PIN Display */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${
                      pin.length > i
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-gray-600'
                    }`}
                  >
                    {pin.length > i && (
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    )}
                  </div>
                ))}
              </div>

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((digit, i) => (
                  <Button
                    key={i}
                    variant={digit === '⌫' ? 'outline' : 'default'}
                    className={`h-14 ft-head ${
                      digit === '' ? 'invisible' : ''
                    } ${digit === '⌫' ? 'border-gray-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    onClick={() => {
                      if (digit === '⌫') handleBackspace();
                      else if (digit) handleKeyPress(digit);
                    }}
                    disabled={!digit}
                  >
                    {digit}
                  </Button>
                ))}
              </div>

              {pin.length === 6 && (
                <Button
                  onClick={handlePINSubmit}
                  className="w-full bg-green-600 hover:bg-green-700 mt-4"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => setShowPINInput(false)}
                className="w-full text-gray-400"
              >
                Try Face ID Again
              </Button>
            </>
          ) : (
            <>
              {/* Biometric Auth Button */}
              <Button
                onClick={handleBiometricAuth}
                disabled={isAuthenticating}
                className="w-full h-24 bg-gray-700 hover:bg-gray-600 flex flex-col items-center justify-center gap-2"
              >
                <Scan className={`w-10 h-10 ${isAuthenticating ? 'animate-pulse' : ''}`} />
                <span>{isAuthenticating ? 'Scanning...' : 'Tap for Face ID / Touch ID'}</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center ft-body">
                  <span className="px-2 bg-gray-800 text-gray-500">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowPINInput(true)}
                className="w-full border-gray-600 text-gray-300"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Use PIN Code
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Settings component
export const LockdownSettings = () => {
  const { isLockdownEnabled, toggleLockdown, lockMessages } = useLockdown();
  const [showPINSetup, setShowPINSetup] = useState(false);
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [hasPIN, setHasPIN] = useState(false);

  useEffect(() => {
    setHasPIN(!!localStorage.getItem('lockdown_pin'));
  }, []);

  const savePIN = () => {
    if (newPIN.length !== 6) {
      toast.error('PIN must be 6 digits');
      return;
    }
    if (newPIN !== confirmPIN) {
      toast.error('PINs do not match');
      return;
    }

    localStorage.setItem('lockdown_pin', newPIN);
    setHasPIN(true);
    setShowPINSetup(false);
    setNewPIN('');
    setConfirmPIN('');
    toast.success('Lockdown PIN saved');
  };

  const handleToggle = (enabled: boolean) => {
    if (enabled && !hasPIN) {
      setShowPINSetup(true);
      return;
    }
    toggleLockdown(enabled);
    if (enabled) {
      toast.success('Lockdown Mode enabled. Messages require Face ID or PIN.');
    } else {
      toast.info('Lockdown Mode disabled');
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          Lockdown Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-400 ft-body">
          Require Face ID or PIN to view messages. Perfect for maximum privacy.
        </p>

        {/* Main Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            {isLockdownEnabled ? (
              <Lock className="w-5 h-5 text-red-500" />
            ) : (
              <Unlock className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <p className="text-white font-medium">Enable Lockdown</p>
              <p className="text-gray-400 ft-meta">
                {isLockdownEnabled ? 'Messages are protected' : 'Messages visible to anyone'}
              </p>
            </div>
          </div>
          <Switch
            checked={isLockdownEnabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Lock Now Button */}
        {isLockdownEnabled && (
          <Button
            onClick={lockMessages}
            variant="outline"
            className="w-full border-red-500 text-red-400 hover:bg-red-500/20"
          >
            <Lock className="w-4 h-4 mr-2" />
            Lock Now
          </Button>
        )}

        {/* PIN Setup */}
        {showPINSetup && (
          <div className="p-4 bg-gray-700/50 rounded-lg space-y-3">
            <p className="text-white font-medium">Set Backup PIN</p>
            <p className="text-gray-400 ft-meta">
              This PIN is used if Face ID fails
            </p>
            <Input
              type="password"
              maxLength={6}
              placeholder="Enter 6-digit PIN"
              value={newPIN}
              onChange={(e) => setNewPIN(e.target.value.replace(/\D/g, ''))}
              className="bg-gray-700 border-gray-600 text-white text-center tracking-widest"
            />
            <Input
              type="password"
              maxLength={6}
              placeholder="Confirm PIN"
              value={confirmPIN}
              onChange={(e) => setConfirmPIN(e.target.value.replace(/\D/g, ''))}
              className="bg-gray-700 border-gray-600 text-white text-center tracking-widest"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPINSetup(false)}
                className="flex-1 border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={savePIN}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Save PIN
              </Button>
            </div>
          </div>
        )}

        {/* Change PIN */}
        {hasPIN && !showPINSetup && (
          <Button
            variant="ghost"
            onClick={() => setShowPINSetup(true)}
            className="w-full text-gray-400"
          >
            <KeyRound className="w-4 h-4 mr-2" />
            Change Backup PIN
          </Button>
        )}

        {/* How it works */}
        <div className="p-3 bg-blue-500/20 rounded-lg space-y-2">
          <p className="text-blue-400 ft-body font-medium">How it works:</p>
          <ul className="text-blue-300 ft-meta space-y-1">
            <li>• Face ID / Touch ID required to view messages</li>
            <li>• PIN fallback if biometric fails</li>
            <li>• Auto-locks after 5 minutes of inactivity</li>
            <li>• Locks when app goes to background</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

// Protected message wrapper component
interface ProtectedMessageProps {
  children: React.ReactNode;
  blur?: boolean;
}

export const ProtectedMessage = ({ children, blur = true }: ProtectedMessageProps) => {
  const { isLockdownEnabled, isAuthenticated, requireAuth } = useLockdown();
  const [revealed, setRevealed] = useState(false);

  if (!isLockdownEnabled || isAuthenticated) {
    return <>{children}</>;
  }

  if (revealed) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative cursor-pointer"
      onClick={async () => {
        const authed = await requireAuth();
        if (authed) setRevealed(true);
      }}
    >
      <div className={blur ? 'blur-lg select-none pointer-events-none' : 'opacity-0'}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 rounded">
        <div className="text-center">
          <Lock className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <p className="text-gray-400 ft-meta">Tap to unlock</p>
        </div>
      </div>
    </div>
  );
};

export default LockdownSettings;
