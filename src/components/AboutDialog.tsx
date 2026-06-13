
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Heart, ExternalLink, Mail, Sparkles } from 'lucide-react';
import { FORTRESS_BUILD, FORTRESS_VERSION } from '@/lib/fortress';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog = ({ isOpen, onClose }: AboutDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#06100b] border-green-500/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-green-400 font-mono">
            <Shield className="w-5 h-5" />
            <span>About SecureChat</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Logo and Version */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-green-500/15 border border-green-400/50 rounded flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
              <Shield className="w-10 h-10 text-green-300" />
            </div>
            <h2 className="ft-head font-bold text-white font-mono tracking-[0.14em]">SECURECHAT FORTRESS</h2>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[2px] text-green-500/55">
              Terminal {FORTRESS_VERSION} · Build {FORTRESS_BUILD}
            </p>
          </div>

          {/* Description */}
          <div className="bg-green-500/7 border border-green-500/15 rounded p-4">
            <p className="ft-body text-gray-300 text-center leading-relaxed">
              A private team messaging workspace with protected channels, locked payloads,
              burn-after-read messages, media sharing, and call-sign based identity.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-gray-300">
              <Lock className="w-4 h-4 text-green-400" />
              <span className="ft-body">Protected message channels</span>
              <span className="ml-auto text-[10px] font-mono uppercase text-green-400">Available</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="ft-body">Key-locked encrypted payloads</span>
              <span className="ml-auto text-[10px] font-mono uppercase text-green-400">Available</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="ft-body">Biometric unlock and identity verification</span>
              <span className="ml-auto text-[10px] font-mono uppercase text-amber-400">Coming soon</span>
            </div>
          </div>

          {/* Credits */}
          <div className="border-t border-green-500/15 pt-4">
            <div className="flex items-center justify-center space-x-2 text-gray-400">
              <span className="ft-body">Built with</span>
              <Heart className="w-4 h-4 text-red-500" />
              <span className="ft-body">by Johnathan Carlson</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex justify-center space-x-4">
            <a
              href="https://fortress-message-comm.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 ft-body text-green-400 hover:text-green-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Website</span>
            </a>
            <a
              href="mailto:support@securechat.com"
              className="flex items-center space-x-1 ft-body text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </a>
          </div>

          {/* Legal */}
          <div className="text-center ft-meta text-gray-500">
            <p>&copy; 2026 SecureChat. All rights reserved.</p>
            <p className="mt-1">Share keys separately. Use secure judgment.</p>
          </div>
        </div>

        <div className="flex justify-center pt-4 border-t border-green-500/15">
          <Button onClick={onClose} className="bg-green-600 hover:bg-green-500 text-white px-8">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
