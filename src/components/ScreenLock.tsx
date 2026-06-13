import React, { useState, useEffect } from 'react';
import { Shield, Lock, Delete, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScreenLockProps {
  onUnlock: () => void;
  onPanic?: () => void;
}

export const ScreenLock = ({ onUnlock, onPanic }: ScreenLockProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showPin, setShowPin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const storedPin = localStorage.getItem('securechat_pin');
  const panicPin = localStorage.getItem('securechat_panic_pin');
  const maxAttempts = 5;

  useEffect(() => {
    // Check if locked out
    const lockoutUntil = localStorage.getItem('securechat_lockout');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      setIsLocked(true);
      const timer = setTimeout(() => {
        setIsLocked(false);
        localStorage.removeItem('securechat_lockout');
        setAttempts(0);
      }, parseInt(lockoutUntil) - Date.now());
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNumberPress = (num: string) => {
    if (pin.length < 6 && !isLocked) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    // Check for panic PIN first
    if (panicPin && pin === panicPin) {
      onPanic?.();
      return;
    }

    if (pin === storedPin) {
      setAttempts(0);
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');

      if (newAttempts >= maxAttempts) {
        // Lock for 5 minutes
        const lockoutTime = Date.now() + 5 * 60 * 1000;
        localStorage.setItem('securechat_lockout', lockoutTime.toString());
        setIsLocked(true);
        setError(`Too many attempts. Locked for 5 minutes.`);
      } else {
        setError(`Invalid PIN. ${maxAttempts - newAttempts} attempts remaining.`);
      }
    }
  };

  const numberPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del']
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-slate-900" />
        </div>
        <h1 className="ft-head font-bold text-white mb-1">SecureChat</h1>
        <p className="text-gray-400 ft-body flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" />
          Enter PIN to unlock
        </p>
      </div>

      {/* PIN Display */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              i < pin.length
                ? 'bg-green-500 scale-110'
                : 'bg-gray-700 border border-gray-600'
            }`}
          />
        ))}
        <button
          onClick={() => setShowPin(!showPin)}
          className="ml-2 p-1 text-gray-500 hover:text-gray-300"
        >
          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Show PIN (hidden by default) */}
      {showPin && pin && (
        <div className="text-green-400 font-mono ft-head mb-4">{pin}</div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-red-400 ft-body mb-4 text-center">{error}</div>
      )}

      {/* Number Pad */}
      <div className="grid gap-3 mb-6">
        {numberPad.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-3 justify-center">
            {row.map((key, keyIndex) => (
              <button
                key={keyIndex}
                onClick={() => {
                  if (key === 'del') handleDelete();
                  else if (key) handleNumberPress(key);
                }}
                disabled={isLocked || (!key && key !== '0')}
                className={`w-16 h-16 rounded-full font-semibold ft-head transition-all ${
                  !key
                    ? 'invisible'
                    : key === 'del'
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 active:scale-95'
                    : 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95 active:bg-green-600'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {key === 'del' ? <Delete className="w-6 h-6 mx-auto" /> : key}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="ghost"
          onClick={handleClear}
          disabled={isLocked}
          className="text-gray-400"
        >
          Clear
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLocked || pin.length < 4}
          className="bg-green-600 hover:bg-green-700 px-8"
        >
          Unlock
        </Button>
      </div>
    </div>
  );
};

// PIN Setup Component
interface PinSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'setup' | 'change' | 'panic';
}

export const PinSetup = ({ onComplete, onSkip, mode = 'setup' }: PinSetupProps) => {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const title = mode === 'panic' ? 'Set Panic PIN' : mode === 'change' ? 'Change PIN' : 'Set Up PIN Lock';
  const description = mode === 'panic'
    ? 'This PIN will trigger panic mode and wipe all data'
    : 'Protect your app with a PIN code';

  const handleNumberPress = (num: string) => {
    const currentPin = step === 'enter' ? pin : confirmPin;
    if (currentPin.length < 6) {
      if (step === 'enter') {
        setPin(prev => prev + num);
      } else {
        setConfirmPin(prev => prev + num);
      }
      setError('');
    }
  };

  const handleDelete = () => {
    if (step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleContinue = () => {
    if (step === 'enter') {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      setStep('confirm');
    } else {
      if (confirmPin !== pin) {
        setError('PINs do not match');
        setConfirmPin('');
        return;
      }
      // Save PIN
      const storageKey = mode === 'panic' ? 'securechat_panic_pin' : 'securechat_pin';
      localStorage.setItem(storageKey, pin);
      onComplete();
    }
  };

  const currentPin = step === 'enter' ? pin : confirmPin;

  const numberPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del']
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 ${mode === 'panic' ? 'bg-red-500' : 'bg-green-500'} rounded-2xl mb-4`}>
          <Lock className="w-8 h-8 text-slate-900" />
        </div>
        <h1 className="ft-head font-bold text-white mb-1">{title}</h1>
        <p className="text-gray-400 ft-body">{description}</p>
        <p className={`ft-body mt-2 ${mode === 'panic' ? 'text-red-400' : 'text-green-400'}`}>
          {step === 'enter' ? 'Enter your PIN' : 'Confirm your PIN'}
        </p>
      </div>

      {/* PIN Display */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              i < currentPin.length
                ? mode === 'panic' ? 'bg-red-500 scale-110' : 'bg-green-500 scale-110'
                : 'bg-gray-700 border border-gray-600'
            }`}
          />
        ))}
      </div>

      {error && <div className="text-red-400 ft-body mb-4">{error}</div>}

      {/* Number Pad */}
      <div className="grid gap-3 mb-6">
        {numberPad.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-3 justify-center">
            {row.map((key, keyIndex) => (
              <button
                key={keyIndex}
                onClick={() => {
                  if (key === 'del') handleDelete();
                  else if (key) handleNumberPress(key);
                }}
                className={`w-16 h-16 rounded-full font-semibold ft-head transition-all ${
                  !key
                    ? 'invisible'
                    : key === 'del'
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95'
                }`}
              >
                {key === 'del' ? <Delete className="w-6 h-6 mx-auto" /> : key}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {onSkip && step === 'enter' && (
          <Button variant="ghost" onClick={onSkip} className="text-gray-400">
            Skip
          </Button>
        )}
        {step === 'confirm' && (
          <Button variant="ghost" onClick={() => { setStep('enter'); setConfirmPin(''); }} className="text-gray-400">
            Back
          </Button>
        )}
        <Button
          onClick={handleContinue}
          disabled={currentPin.length < 4}
          className={mode === 'panic' ? 'bg-red-600 hover:bg-red-700 px-8' : 'bg-green-600 hover:bg-green-700 px-8'}
        >
          {step === 'enter' ? 'Continue' : 'Save PIN'}
        </Button>
      </div>
    </div>
  );
};
