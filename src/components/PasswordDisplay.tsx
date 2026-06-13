
import React, { useState } from 'react';
import { Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PasswordDisplayProps {
  password: string;
  onRegeneratePassword: () => void;
  onCopyPassword: () => void;
}

export const PasswordDisplay = ({ password, onRegeneratePassword, onCopyPassword }: PasswordDisplayProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="ft-body font-medium text-green-400">
          Generated Encryption Key
        </Label>
        <button
          onClick={onRegeneratePassword}
          className="p-1 text-green-400 hover:text-green-300 transition-colors"
          title="Generate New Key"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={password}
          readOnly
          className="bg-gray-700 border-green-500/50 text-green-400 font-mono ft-meta pr-20"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 text-green-400 hover:text-green-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onCopyPassword}
            className="p-1 text-green-400 hover:text-green-300 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="ft-meta text-green-400/70 mt-1 font-mono">
        › Share this key with authorized personnel for decryption
      </p>
    </div>
  );
};
