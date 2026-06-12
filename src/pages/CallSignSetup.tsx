import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/integrations/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Shield, UserCheck, ArrowRight, Loader2 } from 'lucide-react';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const CallSignSetup = () => {
  const [user, setUser] = useState<User | null>(null);
  const [callSign, setCallSign] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/auth');
        return;
      }

      // Check if user already has a call sign
      const profileRef = doc(db, 'profiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        // If they have a valid call sign that's not just a default, redirect to home
        if (profileData.callSign &&
            profileData.callSign !== 'User' &&
            !profileData.callSign.startsWith('user_')) {
          navigate('/');
          return;
        }
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const validateCallSign = () => {
    if (!callSign.trim()) {
      return "Call sign is required";
    }
    if (callSign.trim().length < 2) {
      return "Call sign must be at least 2 characters";
    }
    if (callSign.trim().length > 20) {
      return "Call sign must be 20 characters or less";
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(callSign.trim())) {
      return "Call sign can only contain letters, numbers, underscores, and hyphens";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateCallSign();
    if (validationError) {
      setError(`// ERROR_CODE: VALIDATION_ERROR\n${validationError}`);
      return;
    }

    if (!user) {
      setError("// ERROR_CODE: NO_USER\nUser session not found. Please sign in again.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        callSign: callSign.trim(),
        callSignLower: callSign.trim().toLowerCase()
      });

      navigate('/');
    } catch (err: unknown) {
      const errorCode = "CALLSIGN_SAVE_FAILED";
      console.error(`// ERROR_CODE: ${errorCode}\nError saving call sign:`, getErrorMessage(err));
      setError(`// ERROR_CODE: ${errorCode}\nFailed to save call sign. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
          <p className="text-green-400 font-mono text-sm">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-2xl mb-6">
            <Shield className="w-10 h-10 text-slate-900" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">SecureChat</h1>
          <p className="text-green-500 text-sm font-mono tracking-wider">MILITARY-GRADE ENCRYPTION</p>
        </div>

        {/* Setup Form */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Choose Your Call Sign</h2>
          <p className="text-slate-400 text-sm mt-2">
            This is how you'll be known in the system
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
            {/* rafter-ignore: R-E98AA — call sign is a username-style identifier, not an email address. */}
            <input
              type="text"
              placeholder="Enter Call Sign"
              value={callSign}
              onChange={(e) => setCallSign(e.target.value)}
              autoFocus
              className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>• 2-20 characters</p>
            <p>• Letters, numbers, underscores, and hyphens only</p>
            <p>• This will be your identifier in all communications</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center py-4 px-6 bg-green-500 hover:bg-green-600 rounded-xl text-slate-900 font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <ArrowRight className="w-6 h-6 mr-3" />
                CONTINUE
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-xl">
            <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{error}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallSignSetup;
