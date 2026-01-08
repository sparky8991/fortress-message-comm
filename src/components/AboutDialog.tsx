
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Heart, ExternalLink, Github, Mail } from 'lucide-react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog = ({ isOpen, onClose }: AboutDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-green-400">
            <Shield className="w-5 h-5" />
            <span>About SecureChat</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Logo and Version */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">SecureChat</h2>
            <p className="text-sm text-gray-400 mt-1">Version 1.0.0</p>
          </div>

          {/* Description */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-300 text-center">
              A secure team messaging application featuring end-to-end encryption,
              ghost mode sessions, and military-grade security for your private communications.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-gray-300">
              <Lock className="w-4 h-4 text-green-400" />
              <span className="text-sm">End-to-end encryption (AES-256)</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm">Ghost Mode for sensitive conversations</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Lock className="w-4 h-4 text-blue-400" />
              <span className="text-sm">Biometric authentication support</span>
            </div>
          </div>

          {/* Credits */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-center space-x-2 text-gray-400">
              <span className="text-sm">Built with</span>
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-sm">by Johnathan Carlson</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex justify-center space-x-4">
            <a
              href="https://fortress-message-comm.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Website</span>
            </a>
            <a
              href="mailto:support@securechat.com"
              className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </a>
          </div>

          {/* Legal */}
          <div className="text-center text-xs text-gray-500">
            <p>&copy; 2024 SecureChat. All rights reserved.</p>
            <p className="mt-1">Your privacy is our priority.</p>
          </div>
        </div>

        <div className="flex justify-center pt-4 border-t border-gray-700">
          <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white px-8">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
