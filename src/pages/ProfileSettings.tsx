
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, User, KeyRound, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const ProfileSettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [checkingCallSign, setCheckingCallSign] = useState(false);
    const [profile, setProfile] = useState<{
        first_name: string | null;
        last_name: string | null;
        call_sign: string | null;
        bio: string | null;
        user_number: number | null;
    } | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [callSign, setCallSign] = useState('');
    const [bio, setBio] = useState('');
    const [callSignError, setCallSignError] = useState('');

    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({ title: 'Not authenticated', description: 'Please log in to view your profile.', variant: 'destructive' });
                navigate('/auth');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('first_name, last_name, call_sign, bio, user_number')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            
            if (data) {
                setProfile(data);
                setFirstName(data.first_name || '');
                setLastName(data.last_name || '');
                setCallSign(data.call_sign || '');
                setBio(data.bio || '');
            }
        } catch (error: any) {
            const errorCode = "PROFILE_FETCH_FAILED";
            console.error(`// ERROR_CODE: ${errorCode}\nError fetching profile:`, error);
            toast({ title: 'Error', description: `Failed to load profile data. (Code: ${errorCode})`, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast, navigate]);

    const checkCallSignAvailability = useCallback(async (newCallSign: string) => {
        if (!newCallSign.trim() || newCallSign === profile?.call_sign) {
            setCallSignError('');
            return;
        }

        setCheckingCallSign(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('call_sign', newCallSign.trim())
                .neq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error checking call sign:', error);
                return;
            }

            if (data) {
                setCallSignError('This call sign is already taken. Please choose another one.');
            } else {
                setCallSignError('');
            }
        } catch (error) {
            console.error('Error checking call sign availability:', error);
        } finally {
            setCheckingCallSign(false);
        }
    }, [profile?.call_sign]);

    const handleCallSignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCallSign = e.target.value;
        setCallSign(newCallSign);
        
        // Debounce the availability check
        const timeoutId = setTimeout(() => {
            checkCallSignAvailability(newCallSign);
        }, 500);

        return () => clearTimeout(timeoutId);
    };

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (callSignError) {
            toast({ title: 'Validation Error', description: 'Please fix the call sign error before saving.', variant: 'destructive' });
            return;
        }

        setUpdating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            // Compute full name from first and last name
            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

            const { error } = await supabase
                .from('profiles')
                .update({ 
                    first_name: firstName.trim() || null,
                    last_name: lastName.trim() || null,
                    full_name: fullName || null,
                    call_sign: callSign.trim() || null,
                    username: callSign.trim() || null, // Keep username in sync with call_sign
                    bio: bio.trim() || null
                })
                .eq('id', user.id);

            if (error) {
                if (error.message.includes('duplicate key value violates unique constraint "profiles_call_sign_key"')) {
                     throw new Error("This call sign is already taken. Please choose another one.");
                }
                throw error;
            }
            
            toast({ title: 'Success', description: 'Your profile has been updated.' });
            await fetchProfile(); // Refresh profile data
        } catch (error: any) {
            const errorCode = "PROFILE_UPDATE_FAILED";
            console.error(`// ERROR_CODE: ${errorCode}\nError updating profile:`, error);
            toast({ title: 'Update Failed', description: `${error.message} (Code: ${errorCode})`, variant: 'destructive' });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-12 h-12 text-green-500 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
                <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 text-gray-300 hover:bg-gray-700 hover:text-white">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to App
                </Button>
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center text-white">
                            <User className="mr-3 w-6 h-6 text-green-500"/>
                            Profile Settings
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            Manage your personal information. Your Call Sign is your unique identifier in SecureChat.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div>
                                <Label htmlFor="userNumber" className="text-gray-300">User Number</Label>
                                <div className="flex items-center mt-2">
                                    <KeyRound className="w-5 h-5 mr-3 text-green-500"/>
                                    <span className="text-lg font-mono bg-gray-900/50 border border-gray-600 px-4 py-2 rounded-md">{profile?.user_number || 'N/A'}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Your unique user ID.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                                    <Input 
                                        id="firstName" 
                                        value={firstName} 
                                        onChange={e => setFirstName(e.target.value)} 
                                        className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" 
                                        placeholder="E.g., John"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                                    <Input 
                                        id="lastName" 
                                        value={lastName} 
                                        onChange={e => setLastName(e.target.value)} 
                                        className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" 
                                        placeholder="E.g., Doe"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <Label htmlFor="callSign" className="text-gray-300">Call Sign</Label>
                                <div className="relative">
                                    <Input 
                                        id="callSign" 
                                        value={callSign} 
                                        onChange={handleCallSignChange} 
                                        className={`mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white ${callSignError ? 'border-red-500' : ''}`}
                                        placeholder="E.g., Maverick"
                                    />
                                    {checkingCallSign && (
                                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                    )}
                                </div>
                                {callSignError && (
                                    <p className="text-red-400 text-xs mt-2">{callSignError}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">This will be displayed to other users. Must be unique.</p>
                            </div>
                            
                            <div>
                                <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                                <Textarea 
                                    id="bio" 
                                    value={bio} 
                                    onChange={e => setBio(e.target.value)} 
                                    maxLength={500} 
                                    rows={4} 
                                    className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" 
                                    placeholder="Tell us a little about yourself..."
                                />
                                <p className="text-xs text-gray-500 mt-2 text-right">{bio.length} / 500</p>
                            </div>
                            
                            <CardFooter className="p-0 pt-4 flex justify-end">
                                <Button 
                                    type="submit" 
                                    disabled={updating || loading || !!callSignError || checkingCallSign} 
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                >
                                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </CardFooter>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default ProfileSettingsPage;
