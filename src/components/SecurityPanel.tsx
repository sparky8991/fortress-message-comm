
import React from 'react';
import { Shield, Key, Lock, Eye, EyeOff, Fingerprint, Smartphone, Wifi } from 'lucide-react';

export const SecurityPanel = () => {
  return (
    <div className="p-4 space-y-6">
      {/* Security Status */}
      <div className="bg-green-500 bg-opacity-10 border border-green-500 rounded-lg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Shield className="w-6 h-6 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Security Status</h3>
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

      {/* Encryption Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Key className="w-5 h-5" />
          <span>Encryption Settings</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-white font-medium">Auto-delete Messages</p>
                <p className="text-gray-400 text-sm">Messages deleted after 24 hours</p>
              </div>
            </div>
            <div className="w-10 h-6 bg-green-500 rounded-full p-1">
              <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <EyeOff className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-white font-medium">Screenshot Protection</p>
                <p className="text-gray-400 text-sm">Prevent screenshots in chats</p>
              </div>
            </div>
            <div className="w-10 h-6 bg-green-500 rounded-full p-1">
              <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Fingerprint className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-white font-medium">Biometric Lock</p>
                <p className="text-gray-400 text-sm">Require fingerprint to open</p>
              </div>
            </div>
            <div className="w-10 h-6 bg-green-500 rounded-full p-1">
              <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
            </div>
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
    </div>
  );
};
