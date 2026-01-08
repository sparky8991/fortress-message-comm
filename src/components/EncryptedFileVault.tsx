import { useState, useEffect, useRef } from 'react';
import { FolderLock, Upload, Download, Trash2, File, Image, FileText, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { db, storage } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VaultFile {
  id: string;
  name: string;
  encryptedName: string;
  size: number;
  type: string;
  uploadedAt: Date;
  storagePath: string;
}

// Simple encryption using Web Crypto API
const encryptFile = async (file: File, password: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = await file.arrayBuffer();

  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine salt + iv + encrypted data
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);

  return result.buffer;
};

const decryptFile = async (encryptedData: ArrayBuffer, password: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = new Uint8Array(encryptedData);

  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encrypted = data.slice(28);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  return await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
};

export const EncryptedFileVault = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Check if vault is set up
    const vaultSetup = localStorage.getItem(`vault_setup_${user.uid}`);
    if (!vaultSetup) {
      setIsSetupMode(true);
    }

    if (!isUnlocked) return;

    const q = query(
      collection(db, 'vault_files'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vaultFiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
      })) as VaultFile[];
      setFiles(vaultFiles.sort((a, b) => b.uploadedAt?.getTime() - a.uploadedAt?.getTime()));
    });

    return () => unsubscribe();
  }, [user, isUnlocked]);

  const setupVault = async () => {
    if (!user) return;

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Store a hash to verify password later (simplified)
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(newPassword + user.uid));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    localStorage.setItem(`vault_setup_${user.uid}`, hashHex);
    setVaultPassword(newPassword);
    setIsUnlocked(true);
    setIsSetupMode(false);
    toast.success('Vault created successfully!');
  };

  const unlockVault = async () => {
    if (!user) return;

    const storedHash = localStorage.getItem(`vault_setup_${user.uid}`);
    if (!storedHash) {
      setIsSetupMode(true);
      return;
    }

    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(passwordInput + user.uid));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === storedHash) {
      setVaultPassword(passwordInput);
      setIsUnlocked(true);
      setPasswordInput('');
      toast.success('Vault unlocked');
    } else {
      toast.error('Incorrect password');
    }
  };

  const lockVault = () => {
    setIsUnlocked(false);
    setVaultPassword('');
    setFiles([]);
    toast.success('Vault locked');
  };

  const uploadFile = async (file: File) => {
    if (!user || !vaultPassword) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(20);

      // Encrypt the file
      const encryptedData = await encryptFile(file, vaultPassword);
      setUploadProgress(50);

      // Upload to Firebase Storage
      const fileId = `vault_${user.uid}_${Date.now()}`;
      const storagePath = `vault/${user.uid}/${fileId}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, encryptedData);
      setUploadProgress(80);

      // Save metadata to Firestore
      await setDoc(doc(db, 'vault_files', fileId), {
        userId: user.uid,
        name: file.name,
        encryptedName: fileId,
        size: file.size,
        type: file.type,
        storagePath,
        uploadedAt: new Date(),
      });

      setUploadProgress(100);
      toast.success('File encrypted and uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadFile = async (file: VaultFile) => {
    if (!vaultPassword) return;

    try {
      toast.loading('Decrypting file...');

      const storageRef = ref(storage, file.storagePath);
      const url = await getDownloadURL(storageRef);

      const response = await fetch(url);
      const encryptedData = await response.arrayBuffer();

      const decryptedData = await decryptFile(encryptedData, vaultPassword);

      // Create download link
      const blob = new Blob([decryptedData], { type: file.type });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      toast.dismiss();
      toast.success('File decrypted and downloaded');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to decrypt file. Check your password.');
      console.error('Download error:', error);
    }
  };

  const deleteFile = async (file: VaultFile) => {
    try {
      const storageRef = ref(storage, file.storagePath);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'vault_files', file.id));
      toast.success('File deleted');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />;
    if (type.startsWith('text/') || type.includes('document')) return <FileText className="w-5 h-5 text-green-400" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (isSetupMode) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-purple-500" />
            Setup Encrypted Vault
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-400 text-sm">
            Create a password to encrypt your secure file vault. This password cannot be recovered.
          </p>
          <Input
            type="password"
            placeholder="Create vault password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
          />
          <Button onClick={setupVault} className="w-full bg-purple-600 hover:bg-purple-700">
            <Lock className="w-4 h-4 mr-2" />
            Create Vault
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isUnlocked) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-purple-500" />
            Encrypted File Vault
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter vault password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && unlockVault()}
              className="bg-gray-700 border-gray-600 text-white pr-10"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button onClick={unlockVault} className="w-full bg-purple-600 hover:bg-purple-700">
            <Unlock className="w-4 h-4 mr-2" />
            Unlock Vault
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <FolderLock className="w-5 h-5 text-purple-500" />
          Encrypted File Vault
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={lockVault} className="text-gray-400 hover:text-white">
          <Lock className="w-4 h-4 mr-1" />
          Lock
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-400">Click to upload encrypted files</p>
          <p className="text-gray-500 text-xs mt-1">Files are encrypted before upload</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
        />

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-gray-400 text-sm text-center">Encrypting and uploading...</p>
          </div>
        )}

        {/* File List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(file.type)}
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">{file.name}</p>
                  <p className="text-gray-500 text-xs">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadFile(file)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-green-400"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteFile(file)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {files.length === 0 && (
            <p className="text-gray-500 text-center py-4">No files in vault</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EncryptedFileVault;
