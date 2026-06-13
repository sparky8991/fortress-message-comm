import React, { useState, useEffect, useCallback, useRef } from 'react';
import { auth, db, storage } from '@/integrations/firebase/client';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, ChevronLeft, Eye, EyeOff, Mail, Camera, Trash2, ShieldCheck, Radio, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Toggle } from '@/components/tactical';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};

const getErrorCode = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }

  return undefined;
};

const ProfileSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [checkingCallSign, setCheckingCallSign] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<{
    firstName: string | null;
    lastName: string | null;
    callSign: string | null;
    bio: string | null;
    avatarUrl: string | null;
    showAvatar: boolean;
  } | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [callSign, setCallSign] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatar, setShowAvatar] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [callSignError, setCallSignError] = useState('');

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const { toast } = useToast();
  const navigate = useNavigate();

  const createProfileIfNotExists = async (userId: string, email: string) => {
    try {
      console.log('Creating profile for user:', userId);
      const profileRef = doc(db, 'profiles', userId);
      await setDoc(profileRef, {
        id: userId,
        email: email,
        firstName: null,
        lastName: null,
        callSign: null,
        bio: null,
        avatarUrl: null,
        showAvatar: true,
        createdAt: serverTimestamp()
      });
      console.log('Profile created successfully');
      return true;
    } catch (error) {
      console.error('Error creating profile:', error);
      return false;
    }
  };

  const fetchProfile = useCallback(async () => {
    console.log('Starting fetchProfile...');
    setLoading(true);
    try {
      const user = auth.currentUser;
      console.log('User data:', user);

      if (!user) {
        console.log('No user found, redirecting to auth');
        toast({
          title: 'Not authenticated',
          description: 'Please log in to view your profile.',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      setUserEmail(user.email || '');
      console.log('Fetching profile for user ID:', user.uid);

      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        console.log('No profile found, creating one...');
        const created = await createProfileIfNotExists(user.uid, user.email || '');
        if (created) {
          const newProfileSnap = await getDoc(profileRef);
          if (newProfileSnap.exists()) {
            const data = newProfileSnap.data();
            setProfile({
              firstName: data.firstName || null,
              lastName: data.lastName || null,
              callSign: data.callSign || null,
              bio: data.bio || null,
              avatarUrl: data.avatarUrl || null,
              showAvatar: data.showAvatar !== false
            });
          }
        } else {
          setProfile({
            firstName: null,
            lastName: null,
            callSign: null,
            bio: null,
            avatarUrl: null,
            showAvatar: true
          });
        }
      } else {
        const data = profileSnap.data();
        console.log('Profile found:', data);
        setProfile({
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          callSign: data.callSign || null,
          bio: data.bio || null,
          avatarUrl: data.avatarUrl || null,
          showAvatar: data.showAvatar !== false
        });
      }
    } catch (error: unknown) {
      const errorCode = "PROFILE_FETCH_FAILED";
      console.error(`// ERROR_CODE: ${errorCode}\nError in fetchProfile:`, error);
      toast({
        title: 'Error',
        description: `Failed to load profile data. Please try refreshing the page. (Code: ${errorCode})`,
        variant: 'destructive'
      });

      setProfile({
        firstName: null,
        lastName: null,
        callSign: null,
        bio: null,
        avatarUrl: null,
        showAvatar: true
      });
    } finally {
      setLoading(false);
    }
  }, [toast, navigate]);

  const checkCallSignAvailability = useCallback(async (newCallSign: string) => {
    if (!newCallSign.trim() || newCallSign === profile?.callSign) {
      setCallSignError('');
      return;
    }
    setCheckingCallSign(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const profilesRef = collection(db, 'profiles');
      const q = query(
        profilesRef,
        where('callSign', '==', newCallSign.trim())
      );
      const querySnapshot = await getDocs(q);

      const isTaken = querySnapshot.docs.some(doc => doc.id !== user.uid);

      if (isTaken) {
        setCallSignError('This call sign is already taken. Please choose another one.');
      } else {
        setCallSignError('');
      }
    } catch (error) {
      console.error('Error checking call sign availability:', error);
    } finally {
      setCheckingCallSign(false);
    }
  }, [profile?.callSign]);

  const handleCallSignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCallSign = e.target.value;
    setCallSign(newCallSign);

    const timeoutId = setTimeout(() => {
      checkCallSignAvailability(newCallSign);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPG, etc.)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Create a reference for the avatar
      const avatarRef = ref(storage, `avatars/${user.uid}/profile.${file.name.split('.').pop()}`);

      // Upload the file
      await uploadBytes(avatarRef, file);

      // Get the download URL
      const downloadUrl = await getDownloadURL(avatarRef);

      // Update the profile with the new avatar URL
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        avatarUrl: downloadUrl,
        updatedAt: serverTimestamp()
      });

      setAvatarUrl(downloadUrl);
      toast({
        title: 'Avatar uploaded',
        description: 'Your profile picture has been updated.'
      });
    } catch (error: unknown) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: getErrorMessage(error, 'Failed to upload avatar. Please try again.'),
        variant: 'destructive'
      });
    } finally {
      setUploadingAvatar(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Update the profile to remove the avatar URL
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        avatarUrl: null,
        updatedAt: serverTimestamp()
      });

      setAvatarUrl(null);
      toast({
        title: 'Avatar removed',
        description: 'Your profile picture has been removed.'
      });
    } catch (error: unknown) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'Removal failed',
        description: getErrorMessage(error, 'Failed to remove avatar. Please try again.'),
        variant: 'destructive'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleShowAvatarToggle = async (checked: boolean) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        showAvatar: checked,
        updatedAt: serverTimestamp()
      });

      setShowAvatar(checked);
      toast({
        title: checked ? 'Avatar visible' : 'Avatar hidden',
        description: checked
          ? 'Your avatar will be shown to other users.'
          : 'Your avatar will be hidden from other users.'
      });
    } catch (error: unknown) {
      console.error('Error updating avatar visibility:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update avatar visibility.',
        variant: 'destructive'
      });
    }
  };

  const validatePassword = () => {
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return false;
    }
    if (!newPassword) {
      setPasswordError('New password is required');
      return false;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return false;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) {
      return;
    }
    setUpdatingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      toast({
        title: 'Success',
        description: 'Your password has been updated successfully.'
      });
    } catch (error: unknown) {
      const errorCode = "PASSWORD_UPDATE_FAILED";
      console.error(`// ERROR_CODE: ${errorCode}\nError updating password:`, error);

      let errorMessage = getErrorMessage(error, 'Failed to update password');
      if (getErrorCode(error) === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      }

      setPasswordError(errorMessage);
      toast({
        title: 'Password Update Failed',
        description: `${errorMessage} (Code: ${errorCode})`,
        variant: 'destructive'
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (callSignError) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the call sign error before saving.',
        variant: 'destructive'
      });
      return;
    }
    setUpdating(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not found");

      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        callSign: callSign.trim() || null,
        callSignLower: callSign.trim().toLowerCase() || null,
        bio: bio.trim() || null,
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Success',
        description: 'Your profile has been updated.'
      });
      await fetchProfile();
    } catch (error: unknown) {
      const errorCode = "PROFILE_UPDATE_FAILED";
      console.error(`// ERROR_CODE: ${errorCode}\nError updating profile:`, error);
      toast({
        title: 'Update Failed',
        description: `${getErrorMessage(error, 'Failed to update profile')} (Code: ${errorCode})`,
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchProfile();
      } else {
        navigate('/auth');
      }
    });
    return () => unsubscribe();
  }, [fetchProfile, navigate]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setCallSign(profile.callSign || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatarUrl || null);
      setShowAvatar(profile.showAvatar !== false);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen fortress-shell flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#36E27B]" />
      </div>
    );
  }

  const operatorInitial = callSign ? callSign.slice(0, 2).toUpperCase() : firstName ? firstName.slice(0, 2).toUpperCase() : 'OP';
  const callsignLimitCopy = callSign && callSign !== profile?.callSign
    ? 'Pending call sign change - availability check required before save'
    : 'Call sign is your visible operator identifier';

  return (
    <div className="min-h-screen fortress-shell text-[#DCEAE1]">
      <div className="border-b border-[#1C2B22] bg-[#0C120F] py-2 text-center font-mono text-[9px] font-black uppercase tracking-[0.34em] text-[#36E27B]">
        Operator Settings // SecureChat Fortress // Authorized Personnel Only
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-5 h-9 rounded-sm border border-transparent px-2 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#76897D] hover:border-[#1E5C3C] hover:bg-[#36E27B]/10 hover:text-[#DCEAE1]"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to terminal
        </Button>

        <section className="fortress-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[#1C2B22] bg-[#0C120F] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#36E27B]" />
                <h1 className="font-mono text-[15px] font-black uppercase tracking-[0.18em] text-[#ECF7F0]">
                  Terminal Settings
                </h1>
              </div>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[#76897D]">
                Profile data stored in Firebase // visible fields controlled by operator
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start border border-[#1E5C3C] bg-[#36E27B]/10 px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#36E27B]">
              <Radio className="h-3.5 w-3.5" />
              Profile Active
            </div>
          </div>

          <div className="grid min-h-[680px] lg:grid-cols-[230px_1fr]">
            <aside className="border-b border-[#1C2B22] bg-[#070B09] p-4 lg:border-b-0 lg:border-r">
              <nav className="space-y-2">
                <div className="border border-[#36E27B] bg-[#36E27B]/10 px-3 py-3 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#36E27B]">
                  Operator Profile
                </div>
                <div className="border border-[#1C2B22] px-3 py-3 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#76897D]">
                  Access Key
                </div>
                <div className="border border-[#1C2B22] px-3 py-3 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#76897D]">
                  Visibility
                </div>
              </nav>
            </aside>

            <div className="space-y-8 p-4 sm:p-6 lg:p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="border border-[#1C2B22] bg-[#101814] p-4 sm:p-5">
                  <div className="grid gap-5 lg:grid-cols-[92px_1fr_auto] lg:items-center">
                    <div className="relative">
                      <Avatar className="h-20 w-20 rounded-sm border border-[#1E5C3C] bg-[#12301F]">
                        <AvatarImage src={avatarUrl || undefined} alt="Profile avatar" />
                        <AvatarFallback className="rounded-sm bg-[#12301F] font-mono text-2xl font-black text-[#7BEFA9]">
                          {operatorInitial}
                        </AvatarFallback>
                      </Avatar>
                      {uploadingAvatar && (
                        <div className="absolute inset-0 flex h-20 w-20 items-center justify-center bg-black/65">
                          <Loader2 className="h-7 w-7 animate-spin text-[#36E27B]" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="h-9 rounded-sm border-[#1E5C3C] bg-[#070B09] font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#36E27B] hover:bg-[#36E27B]/10 hover:text-[#ECF7F0]"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                        {avatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            disabled={uploadingAvatar}
                            className="h-9 rounded-sm border-[#5C2420] bg-[#070B09] font-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#FF6B61] hover:bg-[#8C1D18]/20 hover:text-[#FFE0DC]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#76897D]">PNG / JPG up to 5MB // profile storage rules apply</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 border border-[#1C2B22] bg-[#0F1612] px-3 py-3">
                      <div>
                        <p className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#ECF7F0]">Show avatar</p>
                        <p className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-[#76897D]">Visible to operators</p>
                      </div>
                      <Toggle on={showAvatar} onClick={() => handleShowAvatarToggle(!showAvatar)} aria-label="Toggle avatar visibility" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5">
                  <div>
                    <Label htmlFor="userEmail" className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#76897D]">Email Address</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <Mail className="h-5 w-5 text-[#36E27B]" />
                      <span className="min-h-10 flex-1 border border-[#1C2B22] bg-[#070B09] px-3 py-2 font-mono text-[12px] text-[#ECF7F0]">{userEmail || 'N/A'}</span>
                    </div>
                    <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#76897D]">Used for account login only - never shown to other operators.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName" className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#76897D]">First Name</Label>
                      <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-2 rounded-sm border-[#1C2B22] bg-[#070B09] font-mono text-[12px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]" placeholder="E.g., John" />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#76897D]">Last Name</Label>
                      <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} className="mt-2 rounded-sm border-[#1C2B22] bg-[#070B09] font-mono text-[12px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]" placeholder="E.g., Doe" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="callSign" className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#76897D]">Call Sign</Label>
                    <div className="relative mt-2">
                      <Input id="callSign" value={callSign} onChange={handleCallSignChange} className={`rounded-sm border-[#1C2B22] bg-[#070B09] font-mono text-[12px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B] ${callSignError ? 'border-[#FF6B61]' : ''}`} placeholder="E.g., Maverick" />
                      {checkingCallSign && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#36E27B]" />}
                    </div>
                    <div className={`mt-3 border px-3 py-3 ${callSignError ? 'border-[#5C2420] bg-[#8C1D18]/20' : 'border-[#6B4B18] bg-[#1A1507]'}`}>
                      <div className={`flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.16em] ${callSignError ? 'text-[#FF6B61]' : 'text-[#F2B43C]'}`}>
                        <AlertTriangle className="h-4 w-4" />
                        {callSignError ? 'Call sign blocked' : 'Change limits'}
                      </div>
                      <p className={`mt-1 font-mono text-[9px] uppercase tracking-[0.12em] ${callSignError ? 'text-[#FFE0DC]/80' : 'text-[#FFE0A8]/70'}`}>
                        {callSignError || callsignLimitCopy}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio" className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#76897D]">Bio</Label>
                    <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={4} className="mt-2 rounded-sm border-[#1C2B22] bg-[#070B09] font-mono text-[12px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]" placeholder="Tell the net a little about yourself..." />
                    <p className="mt-2 text-right font-mono text-[8px] uppercase tracking-[0.12em] text-[#76897D]">{bio.length} / 500</p>
                  </div>
                </div>

                <div className="flex justify-end border-t border-[#1C2B22] pt-5">
                  <Button type="submit" disabled={updating || loading || !!callSignError || checkingCallSign} className="h-10 rounded-sm bg-[#36E27B] px-5 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#06130B] hover:bg-[#7BEFA9]">
                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Operator Profile
                  </Button>
                </div>
              </form>

              <form onSubmit={handlePasswordChange} className="space-y-5 border-t border-[#1C2B22] pt-7">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-[#36E27B]" />
                    <h2 className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-[#ECF7F0]">Access Key</h2>
                  </div>
                  <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#76897D]">Change Firebase account password after re-authentication.</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  <div>
                    <Label htmlFor="currentPassword" className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#76897D]">Current Password</Label>
                    <div className="relative mt-2">
                      <Input id="currentPassword" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="rounded-sm border-[#1C2B22] bg-[#070B09] pr-10 font-mono text-[12px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]" placeholder="Current password" />
                      <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#36E27B]/70 hover:text-[#7BEFA9]">
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword" className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#76897D]">New Password</Label>
                    <div className="relative mt-2">
                      <Input id="newPassword" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="rounded-sm border-[#1C2B22] bg-[#070B09] pr-10 font-mono text-[12px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]" placeholder="New password" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#36E27B]/70 hover:text-[#7BEFA9]">
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#76897D]">Confirm Password</Label>
                    <div className="relative mt-2">
                      <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="rounded-sm border-[#1C2B22] bg-[#070B09] pr-10 font-mono text-[12px] text-[#ECF7F0] placeholder:text-[#4A5A50] focus-visible:ring-[#36E27B]" placeholder="Confirm password" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#36E27B]/70 hover:text-[#7BEFA9]">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {passwordError && <p className="border border-[#5C2420] bg-[#8C1D18]/20 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#FF6B61]">{passwordError}</p>}

                <div className="flex justify-between gap-4 border-t border-[#1C2B22] pt-5">
                  <p className="hidden font-mono text-[8px] uppercase tracking-[0.12em] text-[#76897D] sm:block">Minimum 6 characters // Current password required</p>
                  <Button type="submit" disabled={updatingPassword || !currentPassword || !newPassword || !confirmPassword} className="h-10 rounded-sm bg-[#36E27B] px-5 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#06130B] hover:bg-[#7BEFA9]">
                    {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Access Key
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfileSettingsPage;
