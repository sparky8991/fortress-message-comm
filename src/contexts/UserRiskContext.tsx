import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/integrations/firebase/client';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export type RiskLevel = 'normal' | 'high-risk';

interface UserRiskContextType {
  riskLevel: RiskLevel;
  setRiskLevel: (level: RiskLevel) => Promise<void>;
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => Promise<void>;
  loading: boolean;
  // Feature visibility helpers based on the Maya UX Matrix
  isFeatureVisible: (feature: FeatureName) => boolean;
  getFeatureExposure: (feature: FeatureName) => FeatureExposure;
}

// Feature exposure levels from the Maya UX Matrix
export type FeatureExposure = 'visible' | 'discoverable' | 'gated' | 'hidden';

// All features that can be controlled
export type FeatureName =
  | 'panic-mode'
  | 'panic-demo'
  | 'ghost-mode'
  | 'ghost-sessions'
  | 'panic-pin'
  | 'burner-identities'
  | 'decoy-icon'
  | 'invisible-ink'
  | 'dead-mans-switch'
  | 'scheduled-messages'
  | 'voice-messages'
  | 'message-recall'
  | 'self-destruct-timer'
  | 'screenshot-protection'
  | 'auto-delete'
  | 'app-lock'
  | 'encryption-details'
  | 'vpn-tor-indicators';

// Feature Exposure Matrix based on Maya's design
const featureMatrix: Record<FeatureName, { normal: FeatureExposure; highRisk: FeatureExposure }> = {
  // Emergency Features
  'panic-mode': { normal: 'hidden', highRisk: 'visible' },
  'panic-demo': { normal: 'hidden', highRisk: 'gated' },
  'panic-pin': { normal: 'hidden', highRisk: 'visible' },

  // Ghost/Stealth Features
  'ghost-mode': { normal: 'hidden', highRisk: 'visible' },
  'ghost-sessions': { normal: 'hidden', highRisk: 'visible' },

  // Identity & Decoy
  'burner-identities': { normal: 'hidden', highRisk: 'discoverable' },
  'decoy-icon': { normal: 'hidden', highRisk: 'discoverable' },

  // Advanced Message Features
  'invisible-ink': { normal: 'discoverable', highRisk: 'visible' },
  'dead-mans-switch': { normal: 'hidden', highRisk: 'gated' },
  'scheduled-messages': { normal: 'hidden', highRisk: 'discoverable' },

  // Chat Features
  'voice-messages': { normal: 'discoverable', highRisk: 'visible' },
  'message-recall': { normal: 'discoverable', highRisk: 'visible' },
  'self-destruct-timer': { normal: 'discoverable', highRisk: 'visible' },

  // Protection Controls
  'screenshot-protection': { normal: 'discoverable', highRisk: 'visible' },
  'auto-delete': { normal: 'discoverable', highRisk: 'visible' },
  'app-lock': { normal: 'discoverable', highRisk: 'visible' },

  // Security Display
  'encryption-details': { normal: 'discoverable', highRisk: 'visible' },
  'vpn-tor-indicators': { normal: 'hidden', highRisk: 'discoverable' },
};

const UserRiskContext = createContext<UserRiskContextType | undefined>(undefined);

export const UserRiskProvider = ({ children }: { children: ReactNode }) => {
  const [riskLevel, setRiskLevelState] = useState<RiskLevel>('normal');
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Load user preferences from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const prefsRef = doc(db, 'user_preferences', user.uid);
          const prefsSnap = await getDoc(prefsRef);

          if (prefsSnap.exists()) {
            const data = prefsSnap.data();
            setRiskLevelState(data.riskLevel || 'normal');
            setHasCompletedOnboardingState(data.hasCompletedOnboarding || false);
          } else {
            // Create default preferences
            await setDoc(prefsRef, {
              riskLevel: 'normal',
              hasCompletedOnboarding: false,
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error loading user preferences:', error);
        }
      } else {
        setUserId(null);
        setRiskLevelState('normal');
        setHasCompletedOnboardingState(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setRiskLevel = async (level: RiskLevel) => {
    if (!userId) return;

    try {
      const prefsRef = doc(db, 'user_preferences', userId);
      await updateDoc(prefsRef, { riskLevel: level });
      setRiskLevelState(level);
    } catch (error) {
      console.error('Error updating risk level:', error);
      throw error;
    }
  };

  const setOnboardingComplete = async () => {
    if (!userId) return;

    try {
      const prefsRef = doc(db, 'user_preferences', userId);
      await updateDoc(prefsRef, { hasCompletedOnboarding: true });
      setHasCompletedOnboardingState(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  };

  const getFeatureExposure = (feature: FeatureName): FeatureExposure => {
    const matrix = featureMatrix[feature];
    if (!matrix) return 'visible';
    return riskLevel === 'high-risk' ? matrix.highRisk : matrix.normal;
  };

  const isFeatureVisible = (feature: FeatureName): boolean => {
    const exposure = getFeatureExposure(feature);
    // 'visible' and 'discoverable' are both shown (discoverable may be less prominent)
    // 'gated' and 'hidden' are not shown by default
    return exposure === 'visible' || exposure === 'discoverable';
  };

  return (
    <UserRiskContext.Provider
      value={{
        riskLevel,
        setRiskLevel,
        hasCompletedOnboarding,
        setOnboardingComplete,
        loading,
        isFeatureVisible,
        getFeatureExposure
      }}
    >
      {children}
    </UserRiskContext.Provider>
  );
};

export const useUserRisk = () => {
  const context = useContext(UserRiskContext);
  if (!context) {
    throw new Error('useUserRisk must be used within a UserRiskProvider');
  }
  return context;
};
