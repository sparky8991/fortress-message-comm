
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
    const [profile, setProfile] = useState<{
        full_name: string | null;
        username: string | null;
        bio: string | null;
        user_number: number | null;
    } | null>(null);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');

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
                .select('full_name, username, bio, user_number')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            
            if (data) {
                setProfile(data);
                setFullName(data.full_name || '');
                setUsername(data.username || '');
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

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName, username: username, bio: bio })
                .eq('id', user.id);

            if (error) {
                if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
                     throw new Error("Username is already taken. Please choose another one.");
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="userNumber" className="text-gray-300">User Number</Label>
                                    <div className="flex items-center mt-2">
                                        <KeyRound className="w-5 h-5 mr-3 text-green-500"/>
                                        <span className="text-lg font-mono bg-gray-900/50 border border-gray-600 px-4 py-2 rounded-md">{profile?.user_number || 'N/A'}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Your unique user ID.</p>
                                </div>
                                <div>
                                    <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" placeholder="E.g., John Doe"/>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="username" className="text-gray-300">Call Sign (Username)</Label>
                                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" placeholder="E.g., Maverick"/>
                                <p className="text-xs text-gray-500 mt-2">This will be displayed to other users. Must be unique.</p>
                            </div>
                             <div>
                                <Label htmlFor="bio" className="text-gray-300">Bio</Label>
                                <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={4} className="mt-2 bg-gray-700 border-gray-600 focus:ring-green-500 text-white" placeholder="Tell us a little about yourself..."/>
                                <p className="text-xs text-gray-500 mt-2 text-right">{bio.length} / 500</p>
                            </div>
                            <CardFooter className="p-0 pt-4 flex justify-end">
                                <Button type="submit" disabled={updating || loading} className="bg-green-600 hover:bg-green-700 text-white font-bold">
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
