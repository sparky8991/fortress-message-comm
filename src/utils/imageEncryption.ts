
import { toast } from '@/hooks/use-toast';

// Simple AES-GCM encryption for client-side image encryption
export class ImageEncryption {
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptImage(file: File, password: string): Promise<{ encryptedData: ArrayBuffer, salt: Uint8Array, iv: Uint8Array, fileName: string }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await this.deriveKey(password, salt);

      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        arrayBuffer
      );

      return {
        encryptedData,
        salt,
        iv,
        fileName: file.name
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt image');
    }
  }

  static async decryptImage(encryptedData: ArrayBuffer, password: string, salt: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
    try {
      const key = await this.deriveKey(password, salt);
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedData
      );

      return decryptedData;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt image - invalid password');
    }
  }

  static createBlobUrl(decryptedData: ArrayBuffer, mimeType: string): string {
    const blob = new Blob([decryptedData], { type: mimeType });
    return URL.createObjectURL(blob);
  }
}
