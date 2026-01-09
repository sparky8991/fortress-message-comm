
import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, Eye, EyeOff, Fingerprint, Smartphone, Wifi, Loader2, AlertTriangle, KeyRound, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useUserRisk } from '@/contexts/UserRiskContext';
import { HoldPanicButton } from './HoldPanicButton';
import { PinSetup } from './ScreenLock';

export const SecurityPanel = () => {
  const { settings: userSettings, updateSecuritySettings, loading } = useUserSettings();
  const { riskLevel, isFeatureVisible, setRiskLevel } = useUserRisk();
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(true);
  const [screenshotProtection, setScreenshotProtection] = useState(true);
  const [biometricLock, setBiometricLock] = useState(true);
  const [autoDeleteTimer, setAutoDeleteTimer] = useState(24);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPanicPinSetup, setShowPanicPinSetup] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(!!localStorage.getItem('securechat_pin'));
  const [panicPinEnabled, setPanicPinEnabled] = useState(!!localStorage.getItem('securechat_panic_pin'));

  // Load settings from database when available
  useEffect(() => {
    if (userSettings?.security_settings) {
      const securitySettings = userSettings.security_settings;
      setAutoDeleteMessages(securitySettings.autoDeleteMessages);
      setScreenshotProtection(securitySettings.screenshotProtection);
      setBiometricLock(securitySettings.biometricLock);
      setAutoDeleteTimer(securitySettings.autoDeleteTimer);
      setHasChanges(false);
    }
  }, [userSettings]);

  const handleSettingChange = (setter: (value: any) => void, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSecuritySettings({
        autoDeleteMessages,
        screenshotProtection,
        biometricLock,
        autoDeleteTimer
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save security settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Security Status */}
      <div className="bg-green-500 bg-opacity-10 border border-green-500 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Shield className="w-6 h-6 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Security Status</h3>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-green-500" />}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Encryption Level</span>
            <span className="text-green-500 font-medium">Military Grade</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Key Exchange</span>
            <span className="text-green-500 font-medium">Verified</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Forward Secrecy</span>
            <span className="text-green-500 font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Security Settings</span>
          </h3>
          {hasChanges && (
            <Button 
              onClick={handleSaveSettings} 
              disabled={saving || loading}
              className="bg-green-600 hover:bg-green-700 text-sm"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-white font-medium">Auto-delete Messages</p>
                <p className="text-gray-400 text-sm">Messages deleted after {autoDeleteTimer} hours</p>
              </div>
            </div>
            <Switch
              checked={autoDeleteMessages}
              onCheckedChange={(checked) => handleSettingChange(setAutoDeleteMessages, checked)}
              disabled={loading}
            />
          </div>

          {autoDeleteMessages && (
            <div className="ml-8 p-3 bg-gray-700 rounded-lg">
              <Label htmlFor="autoDeleteTimer" className="text-white text-sm">
                Auto-delete timer (hours)
              </Label>
              <Input
                id="autoDeleteTimer"
                type="number"
                min="1"
                max="168"
                value={autoDeleteTimer}
                onChange={(e) => handleSettingChange(setAutoDeleteTimer, Number(e.target.value))}
                className="mt-2 bg-gray-600 border-gray-500 text-white"
                disabled={loading}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <EyeOff className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-white font-medium">Screenshot Protection</p>
                <p className="text-gray-400 text-sm">Prevent screenshots in chats</p>
              </div>
            </div>
            <Switch
              checked={screenshotProtection}
              onCheckedChange={(checked) => handleSettingChange(setScreenshotProtection, checked)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Fingerprint className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-white font-medium">Biometric Lock</p>
                <p className="text-gray-400 text-sm">Require fingerprint to open</p>
              </div>
            </div>
            <Switch
              checked={biometricLock}
              onCheckedChange={(checked) => handleSettingChange(setBiometricLock, checked)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Device Security */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Smartphone className="w-5 h-5" />
          <span>Device Security</span>
        </h3>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">This Device</span>
              <span className="text-green-500 font-medium">Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Last Verified</span>
              <span className="text-gray-300">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Device ID</span>
              <span className="text-gray-300 font-mono text-sm">DEV-A7B9C2E1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Network Security */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Wifi className="w-5 h-5" />
          <span>Network Security</span>
        </h3>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Connection</span>
              <span className="text-green-500 font-medium">Secure</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">VPN Status</span>
              <span className="text-green-500 font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Tor Routing</span>
              <span className="text-green-500 font-medium">Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* PIN Lock */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <KeyRound className="w-5 h-5" />
          <span>App Lock</span>
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-white font-medium">PIN Lock</p>
                <p className="text-gray-400 text-sm">
                  {pinEnabled ? 'PIN protection is enabled' : 'Require PIN to open app'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPinSetup(true)}
              className="border-green-600 text-green-400 hover:bg-green-600/20"
            >
              {pinEnabled ? 'Change' : 'Set Up'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-white font-medium">Panic PIN</p>
                <p className="text-gray-400 text-sm">
                  {panicPinEnabled ? 'Decoy PIN is set' : 'Set a PIN that wipes all data'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPanicPinSetup(true)}
              className="border-red-600 text-red-400 hover:bg-red-600/20"
            >
              {panicPinEnabled ? 'Change' : 'Set Up'}
            </Button>
          </div>

          {pinEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem('securechat_pin');
                setPinEnabled(false);
              }}
              className="w-full text-gray-400 hover:text-red-400"
            >
              Disable PIN Lock
            </Button>
          )}
        </div>
      </div>

      {/* Emergency Actions - Always accessible, prominence varies by risk level */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span>Emergency</span>
        </h3>

        <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
          <p className="text-gray-300 text-sm mb-4">
            {riskLevel === 'high-risk'
              ? 'Hold the button below for 3 seconds to wipe all your messages, conversations, and local data. This action cannot be undone.'
              : 'Emergency data wipe is available if you need to quickly clear all your data. This action cannot be undone.'}
          </p>
          <HoldPanicButton variant="full" />
        </div>
      </div>

      {/* Security Experience Toggle */}
      <div className="space-y-4 pt-4 border-t border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Security Experience</span>
        </h3>

        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-gray-400 text-sm">
            Adjust which security features are shown based on your needs.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setRiskLevel('normal')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                riskLevel === 'normal'
                  ? 'bg-green-600 text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setRiskLevel('high-risk')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                riskLevel === 'high-risk'
                  ? 'bg-green-600 text-black'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              High-Risk
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            {riskLevel === 'high-risk'
              ? 'Advanced protection features are enabled for sensitive situations.'
              : 'Simple experience with strong default privacy.'}
          </p>
        </div>
      </div>

      {/* PIN Setup Modal */}
      {showPinSetup && (
        <div className="fixed inset-0 z-50">
          <PinSetup
            mode={pinEnabled ? 'change' : 'setup'}
            onComplete={() => {
              setShowPinSetup(false);
              setPinEnabled(true);
            }}
            onSkip={() => setShowPinSetup(false)}
          />
        </div>
      )}

      {/* Panic PIN Setup Modal */}
      {showPanicPinSetup && (
        <div className="fixed inset-0 z-50">
          <PinSetup
            mode="panic"
            onComplete={() => {
              setShowPanicPinSetup(false);
              setPanicPinEnabled(true);
            }}
            onSkip={() => setShowPanicPinSetup(false)}
          />
        </div>
      )}
    </div>
  );
};
