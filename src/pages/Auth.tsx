import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '@/integrations/firebase/client';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Shield, Mail, Lock, ArrowRight, User, UserCheck } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [callSign, setCallSign] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const validateSignupForm = () => {
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!callSign.trim()) return "Call sign is required";
    if (!email.trim()) return "Email is required";
    if (!password.trim()) return "Password is required";
    if (password !== confirmPassword) return "Passwords do not match";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  // Create user profile in Firestore
  const createUserProfile = async (userId: string, userData: any) => {
    const userRef = doc(db, 'profiles', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const displayName = userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      const callSign = userData.callSign || null;

      await setDoc(userRef, {
        id: userId,
        email: userData.email,
        emailLower: userData.email?.toLowerCase() || null,
        firstName: userData.firstName || userData.displayName?.split(' ')[0] || '',
        lastName: userData.lastName || userData.displayName?.split(' ').slice(1).join(' ') || '',
        displayName: displayName,
        displayNameLower: displayName?.toLowerCase() || null,
        // Only set callSign if explicitly provided (email signup), not for Google sign-in
        callSign: callSign,
        callSignLower: callSign?.toLowerCase() || null,
        avatarUrl: userData.photoURL || null,
        photoURL: userData.photoURL || null,
        createdAt: new Date().toISOString(),
        ghostModeActive: false,
        lastSeen: new Date().toISOString()
      });
    } else {
      // Update existing profile with searchable fields if missing
      const existingData = userSnap.data();
      const updates: any = {};

      if (!existingData.emailLower && existingData.email) {
        updates.emailLower = existingData.email.toLowerCase();
      }
      if (!existingData.displayNameLower && (existingData.displayName || userData.displayName)) {
        const dn = existingData.displayName || userData.displayName;
        updates.displayName = dn;
        updates.displayNameLower = dn?.toLowerCase();
      }
      if (!existingData.callSignLower && existingData.callSign) {
        updates.callSignLower = existingData.callSign.toLowerCase();
      }
      if (userData.photoURL && !existingData.photoURL) {
        updates.photoURL = userData.photoURL;
        updates.avatarUrl = userData.photoURL;
      }

      if (Object.keys(updates).length > 0) {
        await setDoc(userRef, updates, { merge: true });
      }
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createUserProfile(result.user.uid, {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      });
      navigate('/');
    } catch (err: any) {
      setError(`// ERROR_CODE: GOOGLE_AUTH_FAILURE\n${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Auth
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        // Sign In
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      } else {
        // Sign Up
        const validationError = validateSignupForm();
        if (validationError) {
          setError(`// ERROR_CODE: VALIDATION_ERROR\n${validationError}`);
          setLoading(false);
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(result.user.uid, {
          email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          callSign: callSign.trim()
        });
        navigate('/');
      }
    } catch (err: any) {
      let errorCode = "AUTH_FAILURE";
      let detailedMessage = err.message;

      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorCode = "INVALID_CREDENTIALS";
        detailedMessage = "Access denied. Incorrect email or password.";
      } else if (err.code === 'auth/email-already-in-use') {
        errorCode = "USER_ALREADY_EXISTS";
        detailedMessage = "An account with this email already exists.";
      } else if (err.code === 'auth/weak-password') {
        errorCode = "WEAK_PASSWORD";
        detailedMessage = "Password must be at least 6 characters.";
      } else if (err.code === 'auth/invalid-email') {
        errorCode = "INVALID_EMAIL";
        detailedMessage = "Please enter a valid email address.";
      }

      setError(`// ERROR_CODE: ${errorCode}\n${detailedMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setCallSign('');
    setError(null);
    setSuccess(null);
  };

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

        {/* Dynamic Page Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">
            {isLogin ? "Let's Get Logged In" : "Let's Get Signed Up"}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {isLogin ? "Access your secure account" : "Create your secure account"}
          </p>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center py-4 px-6 bg-white hover:bg-gray-100 rounded-xl text-slate-900 font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-700"></div>
          <span className="text-slate-500 text-sm">or</span>
          <div className="flex-1 h-px bg-slate-700"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {/* Signup-only fields */}
          {!isLogin && (
            <>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-green-500" />
                </div>
                <input
                  type="text"
                  placeholder="Enter First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={!isLogin}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-green-500" />
                </div>
                <input
                  type="text"
                  placeholder="Enter Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required={!isLogin}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserCheck className="h-5 w-5 text-green-500" />
                </div>
                <input
                  type="text"
                  placeholder="Enter Call Sign"
                  value={callSign}
                  onChange={(e) => setCallSign(e.target.value)}
                  required={!isLogin}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-green-500" />
            </div>
            <input
              type="email"
              placeholder="Enter Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-green-500" />
            </div>
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {!isLogin && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-green-500" />
              </div>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={!isLogin}
                className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-4 px-6 bg-green-500 hover:bg-green-600 rounded-xl text-slate-900 font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-6 h-6 mr-3" />
            {loading ? 'PROCESSING...' : (isLogin ? 'SIGN IN' : 'SIGN UP')}
          </button>
        </form>

        {success && (
          <div className="mt-6 p-4 bg-green-900/50 border border-green-700 rounded-xl">
            <p className="text-green-400 text-sm font-mono">{success}</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-xl">
            <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-slate-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                resetForm();
              }}
              className="text-green-500 hover:text-green-400 font-medium transition-colors"
            >
              {isLogin ? 'SIGN UP' : 'SIGN IN'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
