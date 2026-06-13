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
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  EyeOff,
  FileKey2,
  Fingerprint,
  Flame,
  Ghost,
  ImageIcon,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Palette,
  Shield,
  TimerReset,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ProfileInput = {
  email: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
  callSign?: string;
  photoURL?: string | null;
};

type AuthError = {
  code?: string;
  message?: string;
};

const getAuthError = (error: unknown): AuthError => {
  if (error && typeof error === 'object') {
    const maybeError = error as AuthError;
    return {
      code: maybeError.code,
      message: maybeError.message,
    };
  }

  return {};
};

const coreFeatures = [
  {
    icon: Shield,
    title: 'Protected messaging channels.',
    text: 'Conversations run inside authenticated, access-controlled channels, with privacy tools layered on top for sensitive messages and media.',
  },
  {
    icon: KeyRound,
    title: 'Key-locked media.',
    text: 'Send a key-protected image or file that will not open without its decryption key. Share the key separately so the payload stays sealed until the right person unlocks it.',
  },
  {
    icon: Flame,
    title: 'Burn after reading.',
    text: 'Hit the burn button and the message is scheduled to delete for both people two minutes after it is opened.',
  },
  {
    icon: ImageIcon,
    title: 'Send more than text.',
    text: 'Share images, GIFs, files, and secure payloads without leaving the workspace.',
  },
  {
    icon: UserCheck,
    title: 'Call signs, not public names.',
    text: 'Identify team members by call sign instead of exposing more personal detail than needed.',
  },
  {
    icon: Users,
    title: 'Built for teams.',
    text: 'Group conversations, status updates, and privacy controls keep communication organized and contained.',
  },
];

const availablePrivacyControls = [
  {
    icon: Flame,
    title: 'Burn-after-read messages',
    text: 'Delete two minutes after they are opened.',
  },
  {
    icon: FileKey2,
    title: 'Key-locked media',
    text: 'Keep sensitive files sealed until the recipient enters the decryption key.',
  },
  {
    icon: UserCheck,
    title: 'Private call signs',
    text: 'Communicate without exposing more personal identity than needed.',
  },
  {
    icon: EyeOff,
    title: 'Chat visibility controls',
    text: 'Control typing indicators, read receipts, message previews, and media behavior.',
  },
  {
    icon: Palette,
    title: 'Personal workspace themes',
    text: 'Customize the workspace without changing how the team communicates.',
  },
];

const comingSoonControls = [
  {
    icon: Fingerprint,
    title: 'Biometric app lock',
    text: 'Face ID or fingerprint unlock on supported devices.',
  },
  {
    icon: Camera,
    title: 'Screenshot controls',
    text: 'Screenshot protection and alerts where device support allows it.',
  },
  {
    icon: TimerReset,
    title: 'Auto-delete schedules',
    text: 'Clear older conversations automatically.',
  },
  {
    icon: Ghost,
    title: 'Expanded Ghost Mode',
    text: 'A more discreet layer for conversations that need it.',
  },
];

const howItWorksSteps = [
  'Create your secure account.',
  'Choose your call sign.',
  'Start private conversations.',
  'Send messages, files, GIFs, and encrypted media.',
  'Use key-locking or burn-after-read when something needs extra control.',
];

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
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
  const createUserProfile = async (userId: string, userData: ProfileInput) => {
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
      const updates: Partial<ProfileInput> & {
        emailLower?: string;
        displayNameLower?: string;
        avatarUrl?: string | null;
      } = {};

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
    } catch (err: unknown) {
      const { message } = getAuthError(err);
      setError(`// ERROR_CODE: GOOGLE_AUTH_FAILURE\n${message || 'Google sign-in failed.'}`);
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
    } catch (err: unknown) {
      const authError = getAuthError(err);
      let errorCode = "AUTH_FAILURE";
      let detailedMessage = authError.message || 'Authentication failed.';

      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        errorCode = "INVALID_CREDENTIALS";
        detailedMessage = "Access denied. Incorrect email or password.";
      } else if (authError.code === 'auth/email-already-in-use') {
        errorCode = "USER_ALREADY_EXISTS";
        detailedMessage = "An account with this email already exists.";
      } else if (authError.code === 'auth/weak-password') {
        errorCode = "WEAK_PASSWORD";
        detailedMessage = "Password must be at least 6 characters.";
      } else if (authError.code === 'auth/invalid-email') {
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

  const openAuthDialog = (mode: 'login' | 'signup') => {
    setIsLogin(mode === 'login');
    resetForm();
    setAuthDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <img
              src="/web-app-manifest-192x192.png"
              alt="SecureChat"
              className="h-11 w-11 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-1"
            />
            <div>
              <div className="ft-head font-bold leading-tight">SecureChat</div>
              <div className="font-mono ft-meta uppercase tracking-[0.28em] text-emerald-400">Fortress</div>
            </div>
          </a>

          <nav className="hidden items-center gap-6 ft-body text-slate-300 md:flex">
            <a href="#features" className="hover:text-emerald-300">Features</a>
            <a href="#privacy" className="hover:text-emerald-300">Privacy</a>
            <a href="#how-it-works" className="hover:text-emerald-300">How it works</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openAuthDialog('login')}
              className="rounded-lg border border-slate-700 px-4 py-2 ft-body font-semibold text-slate-200 transition hover:border-emerald-400/70 hover:text-emerald-300"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openAuthDialog('signup')}
              className="hidden rounded-lg bg-emerald-500 px-4 py-2 ft-body font-bold text-slate-950 transition hover:bg-emerald-400 sm:inline-flex"
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,1))]" />
          <div className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <p className="mb-5 font-mono ft-body uppercase tracking-[0.35em] text-emerald-400">
                Encrypted / Private / Controlled
              </p>
              <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-normal text-white sm:text-5xl lg:text-7xl">
                Secure messaging for teams that need control.
              </h1>
              <p className="mt-6 max-w-2xl ft-head leading-8 text-slate-300">
                Key-locked messages, burn-after-read, and encrypted media sharing built for fast,
                private team communication.
              </p>
              <p className="mt-5 max-w-3xl ft-body leading-7 text-slate-400">
                SecureChat is a private communication workspace for teams that need their
                conversations to stay between the people in them. Send protected messages, lock the
                sensitive ones behind a key only your recipient holds, share images, GIFs, and files
                securely, and set messages to burn after they are read. Run your team under call
                signs so communication stays fast, organized, and private in one place.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openAuthDialog('signup')}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 ft-body font-black text-slate-950 transition hover:bg-emerald-400"
                >
                  Create Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => openAuthDialog('login')}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-6 py-3 ft-body font-bold text-slate-100 transition hover:border-emerald-400/70 hover:text-emerald-300"
                >
                  Sign In
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-lg px-6 py-3 ft-body font-bold text-slate-300 transition hover:text-emerald-300"
                >
                  See how it works
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-4 shadow-2xl shadow-emerald-950/40 backdrop-blur">
              <div className="rounded-xl border border-slate-700 bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold">Fortress Channel</div>
                      <div className="font-mono ft-meta uppercase text-emerald-400">Channel active</div>
                    </div>
                  </div>
                  <Lock className="h-5 w-5 text-emerald-400" />
                </div>

                <div className="space-y-4 p-5">
                  <div className="max-w-[82%] rounded-lg border border-slate-700 bg-slate-800 p-4">
                    <div className="mb-2 inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono ft-meta text-emerald-300">
                      Raven
                    </div>
                    <p className="ft-body text-slate-200">Status check complete. Moving to private channel.</p>
                    <div className="mt-3 flex items-center gap-2 font-mono ft-meta uppercase text-emerald-400">
                      <Shield className="h-3.5 w-3.5" />
                      Encrypted
                    </div>
                  </div>

                  <div className="ml-auto max-w-[82%] rounded-lg border border-emerald-500/70 bg-black p-4 shadow-lg shadow-emerald-950/50">
                    <div className="mb-3 flex items-center gap-2 font-mono ft-meta uppercase text-emerald-300">
                      <FileKey2 className="h-4 w-4" />
                      Key-locked payload
                    </div>
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 ft-body text-emerald-100">
                      File sealed. Recipient needs the one-time key to unlock it.
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-emerald-900/70 pt-3 font-mono ft-meta uppercase text-emerald-400">
                      <span>Burn optional</span>
                      <Flame className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                      <MessageSquare className="mb-3 h-5 w-5 text-cyan-300" />
                      <div className="ft-body font-bold">Direct chat</div>
                      <div className="ft-meta text-slate-500">Private messages</div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                      <TimerReset className="mb-3 h-5 w-5 text-orange-300" />
                      <div className="ft-body font-bold">Burn mode</div>
                      <div className="ft-meta text-slate-500">Two minute timer</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-b border-slate-800 bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="font-mono ft-body uppercase tracking-[0.3em] text-emerald-400">What you can do</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                A private workspace for sensitive team conversations.
              </h2>
              <p className="mt-4 text-slate-400">
                SecureChat is a closed, account-based messaging space, not a public network. Once
                you are in, every conversation runs through channels you control.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {coreFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
                    <Icon className="mb-4 h-6 w-6 text-emerald-400" />
                    <h3 className="ft-head font-bold text-white">{feature.title}</h3>
                    <p className="mt-3 ft-body leading-6 text-slate-400">{feature.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="privacy" className="border-b border-slate-800 bg-slate-900 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="font-mono ft-body uppercase tracking-[0.3em] text-emerald-400">Privacy tools</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                Simple controls that make private messaging feel private.
              </h2>
              <p className="mt-4 text-slate-400">
                Start with the tools that already matter in daily use, then grow into stronger
                device-based controls as the mobile app matures.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/30 bg-slate-950 p-5">
                <div className="mb-5 inline-flex rounded-full bg-emerald-500 px-3 py-1 ft-meta font-black uppercase text-slate-950">
                  Available now
                </div>
                <div className="space-y-4">
                  {availablePrivacyControls.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3">
                        <Icon className="mt-1 h-5 w-5 shrink-0 text-emerald-400" />
                        <div>
                          <h3 className="font-bold text-white">{item.title}</h3>
                          <p className="ft-body text-slate-400">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-950 p-5">
                <div className="mb-5 inline-flex rounded-full border border-slate-600 px-3 py-1 ft-meta font-black uppercase text-slate-300">
                  Coming soon
                </div>
                <div className="space-y-4">
                  {comingSoonControls.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3">
                        <Icon className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
                        <div>
                          <h3 className="font-bold text-white">{item.title}</h3>
                          <p className="ft-body text-slate-400">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-slate-800 bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
            <div>
              <p className="font-mono ft-body uppercase tracking-[0.3em] text-emerald-400">How it works</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                Get in, pick a call sign, and keep the conversation contained.
              </h2>
              <div className="mt-8 space-y-4">
                {howItWorksSteps.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 font-mono font-black text-slate-950">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-slate-200">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-black p-6">
              <div className="mb-4 flex items-center gap-3 text-emerald-400">
                <KeyRound className="h-6 w-6" />
                <h3 className="text-2xl font-black text-white">How key-locked messages work</h3>
              </div>
              <p className="text-slate-300">
                Encrypt your message or media, send it, and SecureChat gives you a one-time
                decryption key. Pass that key to your recipient through a separate channel.
                Without it, the payload stays locked. No key, no message.
              </p>
              <div className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 ft-body text-amber-100">
                Built-in privacy tools reduce what you expose, but no tool replaces good judgment.
                Only share sensitive information with people you trust.
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-xl border border-slate-700 bg-slate-950 p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="max-w-3xl">
              <p className="font-mono ft-body uppercase tracking-[0.3em] text-emerald-400">Ready to go dark?</p>
              <h2 className="mt-3 text-3xl font-black text-white">
                Create an account and start sending messages that stay yours.
              </h2>
              <p className="mt-3 text-slate-400">
                Use key-locking when the payload needs another layer, and burn-after-read when the
                message should disappear after it is opened.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuthDialog('signup')}
              className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 ft-body font-black text-slate-950 transition hover:bg-emerald-400 md:w-auto"
            >
              Create Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 ft-body text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>SecureChat by Johnathan Carlson.</span>
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Firebase authentication and enforced access rules protect account access.
          </span>
        </div>
      </footer>

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-700 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500">
              <Shield className="h-8 w-8 text-slate-950" />
            </div>
            <DialogTitle className="text-center text-2xl font-black">
              {isLogin ? "Let's get you logged in" : 'Create your account'}
            </DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              {isLogin ? 'Access your secure account.' : 'Set up your secure workspace in seconds.'}
            </DialogDescription>
          </DialogHeader>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-xl bg-white px-6 py-4 ft-head font-bold text-slate-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="ft-body text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5 text-emerald-500" />
                  </div>
                  <input
                    placeholder="Enter First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5 text-emerald-500" />
                  </div>
                  <input
                    placeholder="Enter Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <UserCheck className="h-5 w-5 text-emerald-500" />
                  </div>
                  <input
                    placeholder="Enter Call Sign"
                    value={callSign}
                    onChange={(e) => setCallSign(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Mail className="h-5 w-5 text-emerald-500" />
              </div>
              <input
                type="email"
                placeholder="Enter Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="h-5 w-5 text-emerald-500" />
              </div>
              <input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {!isLogin && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-5 w-5 text-emerald-500" />
                </div>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!isLogin}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-4 pl-12 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-4 ft-head font-black text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowRight className="mr-3 h-6 w-6" />
              {loading ? 'PROCESSING...' : (isLogin ? 'SIGN IN' : 'CREATE ACCOUNT')}
            </button>
          </form>

          {success && (
            <div className="rounded-xl border border-emerald-700 bg-emerald-900/50 p-4">
              <p className="font-mono ft-body text-emerald-400">{success}</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-700 bg-red-900/50 p-4">
              <pre className="whitespace-pre-wrap font-mono ft-meta text-red-400">{error}</pre>
            </div>
          )}

          <div className="text-center">
            <p className="text-slate-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
                className="font-bold text-emerald-500 transition-colors hover:text-emerald-400"
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthPage;
