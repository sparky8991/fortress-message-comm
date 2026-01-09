import React, { useState } from 'react';
import { Shield, Lock, MessageSquare, ChevronRight, Check, AlertTriangle, Eye, Fingerprint, Trash2 } from 'lucide-react';
import { useUserRisk, RiskLevel } from '@/contexts/UserRiskContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type OnboardingStep = 'welcome' | 'risk-select' | 'normal-reassurance' | 'high-risk-setup' | 'panic-education' | 'complete';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { setRiskLevel, setOnboardingComplete, riskLevel } = useUserRisk();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // High-risk user settings
  const [enableAppLock, setEnableAppLock] = useState(true);
  const [enableScreenshotProtection, setEnableScreenshotProtection] = useState(true);
  const [enableAutoDelete, setEnableAutoDelete] = useState(true);

  const handleRiskSelect = async () => {
    if (!selectedRisk) return;

    setIsSubmitting(true);
    try {
      await setRiskLevel(selectedRisk);
      if (selectedRisk === 'normal') {
        setCurrentStep('normal-reassurance');
      } else {
        setCurrentStep('high-risk-setup');
      }
    } catch (error) {
      console.error('Error setting risk level:', error);
    }
    setIsSubmitting(false);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await setOnboardingComplete();
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
    setIsSubmitting(false);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeScreen onNext={() => setCurrentStep('risk-select')} />;
      case 'risk-select':
        return (
          <RiskSelectScreen
            selectedRisk={selectedRisk}
            onSelect={setSelectedRisk}
            onNext={handleRiskSelect}
            isSubmitting={isSubmitting}
          />
        );
      case 'normal-reassurance':
        return <NormalReassuranceScreen onComplete={handleComplete} isSubmitting={isSubmitting} />;
      case 'high-risk-setup':
        return (
          <HighRiskSetupScreen
            enableAppLock={enableAppLock}
            enableScreenshotProtection={enableScreenshotProtection}
            enableAutoDelete={enableAutoDelete}
            onToggleAppLock={() => setEnableAppLock(!enableAppLock)}
            onToggleScreenshot={() => setEnableScreenshotProtection(!enableScreenshotProtection)}
            onToggleAutoDelete={() => setEnableAutoDelete(!enableAutoDelete)}
            onNext={() => setCurrentStep('panic-education')}
          />
        );
      case 'panic-education':
        return <PanicEducationScreen onComplete={handleComplete} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderStep()}
      </div>
    </div>
  );
};

// SCREEN 0 - Welcome
const WelcomeScreen = ({ onNext }: { onNext: () => void }) => (
  <div className="text-center space-y-8 animate-in fade-in duration-500">
    {/* Logo */}
    <div className="flex justify-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl shadow-green-500/30">
          <Shield className="w-10 h-10 text-black" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
          <Lock className="w-3 h-3 text-black" />
        </div>
      </div>
    </div>

    {/* Title */}
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">SecureChat</h1>
      <p className="text-gray-400">Private messaging built for control.</p>
    </div>

    {/* Features */}
    <div className="space-y-3 text-left max-w-xs mx-auto">
      <div className="flex items-center gap-3 text-gray-300">
        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span>End-to-end encrypted</span>
      </div>
      <div className="flex items-center gap-3 text-gray-300">
        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span>No ads, no tracking</span>
      </div>
      <div className="flex items-center gap-3 text-gray-300">
        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span>You own your data</span>
      </div>
    </div>

    {/* CTA */}
    <Button
      onClick={onNext}
      className="w-full max-w-xs bg-green-600 hover:bg-green-500 text-black font-semibold py-6 rounded-xl shadow-lg shadow-green-500/20"
    >
      Get Started
      <ChevronRight className="w-5 h-5 ml-2" />
    </Button>
  </div>
);

// SCREEN 2 - Risk Context Selection
const RiskSelectScreen = ({
  selectedRisk,
  onSelect,
  onNext,
  isSubmitting
}: {
  selectedRisk: RiskLevel | null;
  onSelect: (risk: RiskLevel) => void;
  onNext: () => void;
  isSubmitting: boolean;
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">How do you plan to use SecureChat?</h2>
      <p className="text-gray-400 text-sm">This helps us personalize your experience</p>
    </div>

    {/* Options */}
    <div className="space-y-3">
      <button
        onClick={() => onSelect('normal')}
        className={cn(
          "w-full p-4 rounded-xl border-2 text-left transition-all",
          selectedRisk === 'normal'
            ? "border-green-500 bg-green-500/10"
            : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0",
            selectedRisk === 'normal' ? "border-green-500 bg-green-500" : "border-gray-600"
          )}>
            {selectedRisk === 'normal' && <Check className="w-3 h-3 text-black" />}
          </div>
          <div>
            <h3 className="text-white font-medium mb-1">Everyday private conversations</h3>
            <p className="text-gray-400 text-sm">I want strong privacy with a simple experience</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelect('high-risk')}
        className={cn(
          "w-full p-4 rounded-xl border-2 text-left transition-all",
          selectedRisk === 'high-risk'
            ? "border-green-500 bg-green-500/10"
            : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0",
            selectedRisk === 'high-risk' ? "border-green-500 bg-green-500" : "border-gray-600"
          )}>
            {selectedRisk === 'high-risk' && <Check className="w-3 h-3 text-black" />}
          </div>
          <div>
            <h3 className="text-white font-medium mb-1">Sensitive or high-risk situations</h3>
            <p className="text-gray-400 text-sm">I may need advanced protection and fast controls</p>
          </div>
        </div>
      </button>
    </div>

    {/* Microcopy */}
    <p className="text-center text-gray-500 text-xs">
      You can change this anytime in Settings. This only affects defaults and guidance.
    </p>

    {/* CTA */}
    <Button
      onClick={onNext}
      disabled={!selectedRisk || isSubmitting}
      className="w-full bg-green-600 hover:bg-green-500 text-black font-semibold py-6 rounded-xl disabled:opacity-50"
    >
      Continue
      <ChevronRight className="w-5 h-5 ml-2" />
    </Button>
  </div>
);

// SCREEN 3A - Normal User Reassurance
const NormalReassuranceScreen = ({
  onComplete,
  isSubmitting
}: {
  onComplete: () => void;
  isSubmitting: boolean;
}) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">You're protected by default</h2>
    </div>

    {/* Protection list */}
    <div className="space-y-4 bg-gray-800/50 rounded-xl p-5 border border-gray-700">
      <div className="flex items-center gap-3">
        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span className="text-gray-300">End-to-end encryption</span>
      </div>
      <div className="flex items-center gap-3">
        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span className="text-gray-300">Secure key exchange</span>
      </div>
      <div className="flex items-center gap-3">
        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span className="text-gray-300">No message tracking</span>
      </div>
    </div>

    <p className="text-center text-gray-400 text-sm">
      You can explore more security controls anytime in Settings.
    </p>

    <Button
      onClick={onComplete}
      disabled={isSubmitting}
      className="w-full bg-green-600 hover:bg-green-500 text-black font-semibold py-6 rounded-xl"
    >
      <MessageSquare className="w-5 h-5 mr-2" />
      Start chatting
    </Button>
  </div>
);

// SCREEN 3B - High-Risk Setup
const HighRiskSetupScreen = ({
  enableAppLock,
  enableScreenshotProtection,
  enableAutoDelete,
  onToggleAppLock,
  onToggleScreenshot,
  onToggleAutoDelete,
  onNext
}: {
  enableAppLock: boolean;
  enableScreenshotProtection: boolean;
  enableAutoDelete: boolean;
  onToggleAppLock: () => void;
  onToggleScreenshot: () => void;
  onToggleAutoDelete: () => void;
  onNext: () => void;
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Lock down this device</h2>
      <p className="text-gray-400 text-sm">We recommend enabling these now</p>
    </div>

    {/* Security options */}
    <div className="space-y-3">
      <button
        onClick={onToggleAppLock}
        className={cn(
          "w-full p-4 rounded-xl border transition-all flex items-center justify-between",
          enableAppLock
            ? "border-green-500/50 bg-green-500/10"
            : "border-gray-700 bg-gray-800/50"
        )}
      >
        <div className="flex items-center gap-3">
          <Fingerprint className="w-5 h-5 text-green-500" />
          <span className="text-white">App Lock (PIN / Biometrics)</span>
        </div>
        <div className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center",
          enableAppLock ? "border-green-500 bg-green-500" : "border-gray-600"
        )}>
          {enableAppLock && <Check className="w-3 h-3 text-black" />}
        </div>
      </button>

      <button
        onClick={onToggleScreenshot}
        className={cn(
          "w-full p-4 rounded-xl border transition-all flex items-center justify-between",
          enableScreenshotProtection
            ? "border-green-500/50 bg-green-500/10"
            : "border-gray-700 bg-gray-800/50"
        )}
      >
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-green-500" />
          <span className="text-white">Screenshot protection</span>
        </div>
        <div className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center",
          enableScreenshotProtection ? "border-green-500 bg-green-500" : "border-gray-600"
        )}>
          {enableScreenshotProtection && <Check className="w-3 h-3 text-black" />}
        </div>
      </button>

      <button
        onClick={onToggleAutoDelete}
        className={cn(
          "w-full p-4 rounded-xl border transition-all flex items-center justify-between",
          enableAutoDelete
            ? "border-green-500/50 bg-green-500/10"
            : "border-gray-700 bg-gray-800/50"
        )}
      >
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-green-500" />
          <span className="text-white">Auto-delete messages (24h)</span>
        </div>
        <div className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center",
          enableAutoDelete ? "border-green-500 bg-green-500" : "border-gray-600"
        )}>
          {enableAutoDelete && <Check className="w-3 h-3 text-black" />}
        </div>
      </button>
    </div>

    <Button
      onClick={onNext}
      className="w-full bg-green-600 hover:bg-green-500 text-black font-semibold py-6 rounded-xl"
    >
      Configure now
      <ChevronRight className="w-5 h-5 ml-2" />
    </Button>

    <button
      onClick={onNext}
      className="w-full text-gray-500 hover:text-gray-400 text-sm"
    >
      Skip for now
    </button>
  </div>
);

// SCREEN 4B - Panic Education
const PanicEducationScreen = ({
  onComplete,
  isSubmitting
}: {
  onComplete: () => void;
  isSubmitting: boolean;
}) => {
  const [showDemo, setShowDemo] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);

  const runDemo = () => {
    setShowDemo(true);
    setDemoProgress(0);

    // Simulate wipe animation
    const interval = setInterval(() => {
      setDemoProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowDemo(false), 500);
          return 100;
        }
        return prev + 5;
      });
    }, 50);
  };

  if (showDemo) {
    return (
      <div className="text-center space-y-6 animate-in fade-in duration-300">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
        <h2 className="text-xl font-bold text-white">DEMO: Emergency Wipe</h2>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-100"
            style={{ width: `${demoProgress}%` }}
          />
        </div>
        <p className="text-gray-400 text-sm">
          {demoProgress < 100 ? 'Simulating data wipe...' : 'Demo complete! No real data was affected.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Emergency wipe (Panic Mode)</h2>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 space-y-4">
        <p className="text-gray-300">
          If your device is at risk, this instantly erases all data.
        </p>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Requires press-and-hold (3 seconds)
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Cannot be undone
          </li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={runDemo}
          variant="outline"
          className="flex-1 border-red-600 text-red-400 hover:bg-red-600/20 py-5"
        >
          Try a demo
        </Button>
        <Button
          onClick={onComplete}
          disabled={isSubmitting}
          className="flex-1 bg-green-600 hover:bg-green-500 text-black font-semibold py-5"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
