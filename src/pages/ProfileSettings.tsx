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
import { Switch } from '@/components/ui/switch';
import { Loader2, User, KeyRound, ChevronLeft, Lock, Eye, EyeOff, Mail, Camera, Trash2, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload avatar. Please try again.',
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
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'Removal failed',
        description: error.message || 'Failed to remove avatar. Please try again.',
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
    } catch (error: any) {
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
    } catch (error: any) {
      const errorCode = "PASSWORD_UPDATE_FAILED";
      console.error(`// ERROR_CODE: ${errorCode}\nError updating password:`, error);

      let errorMessage = error.message;
      if (error.code === 'auth/wrong-password') {
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
    } catch (error: any) {
      const errorCode = "PROFILE_UPDATE_FAILED";
      console.error(`// ERROR_CODE: ${errorCode}\nError updating profile:`, error);
      toast({
        title: 'Update Failed',
        description: `${error.message} (Code: ${errorCode})`,
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 text-gray-300 hover:bg-gray-700 hover:text-white">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to App
        </Button>

        {/* Profile Information Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center text-white">
              <User className="mr-3 w-6 h-6 text-green-500" />
              Profile Settings
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage your personal information. Your Call Sign is your unique identifier in SecureChat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Avatar Upload Section */}
              <div className="flex flex-col items-center space-y-4 pb-6 border-b border-gray-700">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-gray-600">
                    <AvatarImage src={avatarUrl || undefined} alt="Profile avatar" />
                    <AvatarFallback className="bg-gray-700 text-white text-2xl">
                      {callSign ? callSign.charAt(0).toUpperCase() : firstName ? firstName.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
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
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
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
                      className="border-red-600 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>

                <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>

                {/* Show Avatar Toggle */}
                <div className="flex items-center space-x-3 pt-2">
                  <Switch
                    id="showAvatar"
                    checked={showAvatar}
                    onCheckedChange={handleShowAvatarToggle}
                  />
                  <Label htmlFor="showAvatar" className="text-gray-300 text-sm cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                      <span>Show my avatar to other users</span>
                    </div>
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="userEmail" className="text-gray-300">Email Address</Label>
                <div className="flex items-center mt-2">
                  <Mail className="w-5 h-5 mr-3 text-green-500" />
                  <span className="text-lg bg-gray-900/50 border border-gray-600 px-4 py-2 rounded-md text-slate-50">{userEmail || 'N/A'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">The email address used for your account login.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" placeholder="E.g., John" />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" placeholder="E.g., Doe" />
                </div>
              </div>

              <div>
                <Label htmlFor="callSign" className="text-gray-300">Call Sign</Label>
                <div className="relative">
                  <Input id="callSign" value={callSign} onChange={handleCallSignChange} className={`mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white ${callSignError ? 'border-red-500' : ''}`} placeholder="E.g., Maverick" />
                  {checkingCallSign && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                </div>
                {callSignError && <p className="text-red-400 text-xs mt-2">{callSignError}</p>}
                <p className="text-xs text-gray-500 mt-2">This will be displayed to other users. Must be unique.</p>
              </div>

              <div>
                <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={4} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" placeholder="Tell us a little about yourself..." />
                <p className="text-xs text-gray-500 mt-2 text-right">{bio.length} / 500</p>
              </div>

              <CardFooter className="p-0 pt-4 flex justify-end">
                <Button type="submit" disabled={updating || loading || !!callSignError || checkingCallSign} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                  {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl flex items-center text-white">
              <Lock className="mr-3 w-5 h-5 text-green-500" />
              Change Password
            </CardTitle>
            <CardDescription className="text-gray-400">
              Update your account password for security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
                <div className="relative">
                  <Input id="currentPassword" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white pr-10" placeholder="Enter your current password" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300">
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                <div className="relative">
                  <Input id="newPassword" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white pr-10" placeholder="Enter your new password" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Password must be at least 6 characters long.</p>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white pr-10" placeholder="Confirm your new password" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}

              <CardFooter className="p-0 pt-4 flex justify-end">
                <Button type="submit" disabled={updatingPassword || !currentPassword || !newPassword || !confirmPassword} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                  {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
