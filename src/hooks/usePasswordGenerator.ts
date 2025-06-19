
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export const usePasswordGenerator = () => {
  const [generatedPassword, setGeneratedPassword] = useState('');

  const generateSecurePassword = () => {
    // Military-grade password generation: 32 characters, alphanumeric + symbols
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < array.length; i++) {
      password += charset[array[i] % charset.length];
    }
    
    setGeneratedPassword(password);
    toast({
      title: '🔐 SECURE KEY GENERATED',
      description: 'Military-grade encryption key ready for deployment.',
    });
  };

  const copyPasswordToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast({
        title: '📋 KEY COPIED',
        description: 'Encryption key copied to secure clipboard.',
      });
    } catch (error) {
      toast({
        title: '❌ COPY FAILED',
        description: 'Failed to copy key to clipboard.',
        variant: 'destructive'
      });
    }
  };

  // Generate secure military-grade password on hook initialization
  useEffect(() => {
    generateSecurePassword();
  }, []);

  return {
    generatedPassword,
    generateSecurePassword,
    copyPasswordToClipboard
  };
};
