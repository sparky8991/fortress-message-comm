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
  ShieldCheck,
  Smartphone,
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
import { FORTRESS_VERSION } from '@/lib/fortress';

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
    icon: ShieldCheck,
    title: 'End-to-end encryption.',
    text: 'Once your keys are set, messages are sealed on your device with your own identity key and opened only on your recipient’s. The server stores ciphertext — never your words. Keys never leave your device.',
  },
  {
    icon: KeyRound,
    title: 'Key-locked media.',
    text: 'Send a key-protected image or file that will not open without its one-time key. Share the key separately so the payload stays sealed until the right person unlocks it.',
  },
  {
    icon: Flame,
    title: 'Burn after reading.',
    text: 'Arm the burn and the message is scheduled to delete for both people two minutes after it is opened.',
  },
  {
    icon: ImageIcon,
    title: 'Send more than text.',
    text: 'Share images, GIFs, files, and sealed payloads without leaving the channel.',
  },
  {
    icon: UserCheck,
    title: 'Call signs, not public names.',
    text: 'Operate under a call sign instead of exposing more personal detail than the mission needs.',
  },
  {
    icon: Smartphone,
    title: 'Installable on any device.',
    text: 'Run SecureChat as an installable app on phone or desktop — full-screen, with a mobile build built for the field.',
  },
];

const availablePrivacyControls = [
  {
    icon: ShieldCheck,
    title: 'End-to-end encryption',
    text: 'Generate identity keys on your device and your messages are sealed — once set up, the server only ever sees ciphertext.',
  },
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
  'Set up your encryption keys — a passphrase plus a one-time recovery code.',
  'Start private conversations.',
  'Send messages, files, GIFs, and sealed media.',
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

  const inputClass =
    'w-full rounded-sm border border-[#1C2B22] bg-[#0F1612] py-3.5 pl-11 pr-4 font-mono text-[13px] text-[#DCEAE1] placeholder:text-[#76897D]/60 transition-colors focus:border-[#1E5C3C] focus:outline-none focus:ring-1 focus:ring-[#36E27B]/30';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070B09] font-mono text-[#DCEAE1] antialiased">
      {/* Ambient atmosphere: radial glow + tactical grid + top edge light */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_78%_-5%,rgba(54,226,123,0.13),transparent_60%),radial-gradient(700px_500px_at_0%_100%,rgba(54,226,123,0.06),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(rgba(54,226,123,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(54,226,123,0.05)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#36E27B]/60 to-transparent" />
      </div>

      {/* Classification strip */}
      <div className="relative z-20 flex items-center justify-center border-b border-[#5C2420]/70 bg-[#1A0B09] px-4 py-1 text-center">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.32em] text-[#FF6B61]/90 sm:text-[10px]">
          SECRET//NOFORN — ENCRYPTED CHANNEL — AUTHORIZED PERSONNEL ONLY
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#1C2B22] bg-[#070B09]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 shadow-[0_0_18px_rgba(54,226,123,0.18)]">
              <Shield className="h-5 w-5 text-[#36E27B]" />
            </div>
            <div className="leading-none">
              <div className="font-mono text-[15px] font-extrabold uppercase tracking-[2px] text-[#ECF7F0]">SECURECHAT</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-[#36E27B]">
                FORTRESS · {FORTRESS_VERSION}
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-[0.18em] text-[#76897D] md:flex">
            <a href="#features" className="transition-colors hover:text-[#7BEFA9]">Features</a>
            <a href="#privacy" className="transition-colors hover:text-[#7BEFA9]">Privacy</a>
            <a href="#how-it-works" className="transition-colors hover:text-[#7BEFA9]">How it works</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openAuthDialog('login')}
              className="rounded-sm border border-[#1C2B22] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#DCEAE1] transition-colors hover:border-[#1E5C3C] hover:text-[#7BEFA9]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openAuthDialog('signup')}
              className="hidden rounded-sm bg-[#36E27B] px-4 py-2 font-mono text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#06130B] shadow-[0_0_18px_rgba(54,226,123,0.22)] transition-colors hover:bg-[#7BEFA9] sm:inline-flex"
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10">
        {/* Hero */}
        <section className="border-b border-[#1C2B22]">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-20">
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
              <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-[#1E5C3C] bg-[#36E27B]/[0.07] px-3 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#36E27B] shadow-[0_0_10px_rgba(54,226,123,0.8)]" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#36E27B]">
                  Encrypted / Private / Controlled
                </span>
              </div>

              <h1 className="font-mono text-4xl font-extrabold leading-[1.06] tracking-tight text-[#ECF7F0] sm:text-5xl lg:text-[64px]">
                Encrypted comms for teams that need <span className="text-[#36E27B]">control.</span>
              </h1>

              <p className="mt-6 max-w-xl font-mono text-[15px] leading-7 text-[#9FB2A6]">
                End-to-end encryption, key-locked payloads, and burn-after-read — built for fast,
                private team communication. Generate your keys and conversations are sealed on your
                device, with the server holding only ciphertext — never your words.
              </p>

              <p className="mt-4 max-w-xl text-[13px] leading-6 text-[#76897D]">
                SecureChat is a closed, account-based workspace — not a public network. Lock the sensitive
                messages behind a key only your recipient holds, share images, GIFs, and files securely,
                and run your team under call signs so comms stay fast, organized, and contained.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openAuthDialog('signup')}
                  className="group inline-flex items-center justify-center rounded-sm bg-[#36E27B] px-6 py-3.5 font-mono text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#06130B] shadow-[0_0_22px_rgba(54,226,123,0.22)] transition-all hover:bg-[#7BEFA9] hover:shadow-[0_0_30px_rgba(54,226,123,0.32)]"
                >
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openAuthDialog('login')}
                  className="inline-flex items-center justify-center rounded-sm border border-[#1C2B22] px-6 py-3.5 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-[#DCEAE1] transition-colors hover:border-[#1E5C3C] hover:text-[#7BEFA9]"
                >
                  Sign In
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-2 py-3.5 font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-[#76897D] transition-colors hover:text-[#7BEFA9]"
                >
                  See how it works →
                </a>
              </div>

              <div className="mt-9 flex items-center gap-5 border-t border-[#141E18] pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#4A5A50]">
                <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-[#36E27B]" /> X25519 · XChaCha20</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#36E27B]" /> Keys on device</span>
              </div>
            </div>

            {/* Hero device preview — coded Fortress Channel card */}
            <div className="relative animate-in fade-in slide-in-from-bottom-5 duration-1000">
              {/* ambient glow + floating lock */}
              <div aria-hidden className="absolute -inset-10 -z-10 bg-[radial-gradient(closest-side,rgba(54,226,123,0.16),transparent)]" />
              <div aria-hidden className="absolute -left-7 top-1/3 hidden h-16 w-16 place-items-center rounded-xl border border-[#1E5C3C] bg-[#0C120F]/80 shadow-[0_0_30px_rgba(54,226,123,0.25)] backdrop-blur-sm lg:grid">
                <Lock className="h-7 w-7 animate-pulse text-[#36E27B]" />
              </div>

              <div className="rounded-lg border border-[#1E5C3C]/70 bg-[#0C120F]/80 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_50px_-12px_rgba(54,226,123,0.2)] backdrop-blur-md lg:[transform:perspective(1600px)_rotateY(-9deg)_rotateX(3deg)]">
                <div className="overflow-hidden rounded-md border border-[#1C2B22] bg-[#070B09]">
                  {/* card header */}
                  <div className="flex items-center justify-between border-b border-[#141E18] bg-[#0C120F] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-sm bg-[#36E27B] shadow-[0_0_16px_rgba(54,226,123,0.45)]">
                        <Shield className="h-4 w-4 text-[#06130B]" />
                      </div>
                      <div className="leading-none">
                        <div className="font-mono text-[13px] font-bold text-[#ECF7F0]">Fortress Channel</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#36E27B]" />
                          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#36E27B]">Channel active</span>
                        </div>
                      </div>
                    </div>
                    <Lock className="h-4 w-4 text-[#36E27B]" />
                  </div>

                  <div className="space-y-3 p-4">
                    {/* incoming message */}
                    <div className="max-w-[85%] rounded-md rounded-bl-sm border border-[#1C2B22] bg-[#101814] p-3.5">
                      <div className="mb-2 inline-flex rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#7BEFA9]">
                        Raven
                      </div>
                      <p className="font-mono text-[12px] leading-relaxed text-[#DCEAE1]">
                        Status check complete. Moving to private channel.
                      </p>
                      <div className="mt-2.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-[#5C6E63]">
                        <span className="inline-flex items-center gap-1 text-[#36E27B]"><ShieldCheck className="h-3 w-3" /> Encrypted</span>
                        <span>10:24 ✓✓</span>
                      </div>
                    </div>

                    {/* key-locked payload */}
                    <div className="rounded-md border border-[#1E5C3C] bg-black/70 p-3.5 shadow-[0_0_24px_-8px_rgba(54,226,123,0.3)]">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10">
                            <Lock className="h-3.5 w-3.5 text-[#36E27B]" />
                          </div>
                          <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#36E27B]">Key-locked payload</span>
                        </div>
                        <ShieldCheck className="h-4 w-4 text-[#36E27B]/70" />
                      </div>
                      <div className="rounded-sm border border-[#1C2B22] bg-[#0F1612] p-3 font-mono text-[11px] leading-relaxed text-[#DCEAE1]">
                        File sealed. Recipient needs the one-time key to unlock it.
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#141E18] pt-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#36E27B]">
                        <span>Burn after read</span>
                        <Flame className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* mode tiles */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-md border border-[#1C2B22] bg-[#0C120F] p-3">
                        <MessageSquare className="mb-2.5 h-4 w-4 text-[#7BEFA9]" />
                        <div className="font-mono text-[11px] font-bold text-[#ECF7F0]">Direct chat</div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#5C6E63]">Private messages</div>
                      </div>
                      <div className="rounded-md border border-[#1C2B22] bg-[#0C120F] p-3">
                        <Flame className="mb-2.5 h-4 w-4 text-[#F2792B]" />
                        <div className="font-mono text-[11px] font-bold text-[#ECF7F0]">Burn mode</div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#5C6E63]">Self-destruct</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 border-t border-[#141E18] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#4A5A50]">
                    <ShieldCheck className="h-3 w-3 text-[#36E27B]" /> End-to-end encrypted · keys on device only
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-[#1C2B22] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#36E27B]">What you can do</p>
              <h2 className="mt-3 font-mono text-3xl font-extrabold tracking-tight text-[#ECF7F0] sm:text-4xl">
                A private workspace for sensitive team conversations.
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-[#76897D]">
                Once you are in, every conversation runs through channels you control — sealed end-to-end,
                with privacy tools layered on top for the traffic that needs them.
              </p>
            </div>

            <div className="mt-10 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {coreFeatures.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="group rounded-md border border-[#1C2B22] bg-[#0C120F]/80 p-5 transition-colors hover:border-[#1E5C3C]"
                  >
                    <div className="mb-4 inline-grid h-10 w-10 place-items-center rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 text-[#36E27B] transition-shadow group-hover:shadow-[0_0_18px_rgba(54,226,123,0.22)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-mono text-[15px] font-bold text-[#ECF7F0]">{feature.title}</h3>
                    <p className="mt-2.5 text-[13px] leading-6 text-[#76897D]">{feature.text}</p>
                    <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-[#2BC46A]/60">
                      {String(i + 1).padStart(2, '0')} / 06
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="border-b border-[#1C2B22] bg-[#0A0F0C] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#36E27B]">Privacy tools</p>
              <h2 className="mt-3 font-mono text-3xl font-extrabold tracking-tight text-[#ECF7F0] sm:text-4xl">
                Controls that make private messaging actually private.
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-[#76897D]">
                Start with the tools that matter in daily use — encryption is on by default once your keys
                are set — then grow into stronger device-based controls as the mobile app matures.
              </p>
            </div>

            <div className="grid gap-3.5 xl:grid-cols-2">
              <div className="rounded-md border border-[#1E5C3C] bg-[#0C120F] p-5">
                <div className="mb-5 inline-flex rounded-sm bg-[#36E27B] px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#06130B]">
                  Available now
                </div>
                <div className="space-y-4">
                  {availablePrivacyControls.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#36E27B]" />
                        <div>
                          <h3 className="font-mono text-[13px] font-bold text-[#ECF7F0]">{item.title}</h3>
                          <p className="mt-0.5 text-[12px] leading-5 text-[#76897D]">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-md border border-[#1C2B22] bg-[#0C120F] p-5">
                <div className="mb-5 inline-flex rounded-sm border border-[#6B4E16] bg-[#F2B43C]/10 px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F2B43C]">
                  Coming soon
                </div>
                <div className="space-y-4">
                  {comingSoonControls.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#F2B43C]/80" />
                        <div>
                          <h3 className="font-mono text-[13px] font-bold text-[#ECF7F0]">{item.title}</h3>
                          <p className="mt-0.5 text-[12px] leading-5 text-[#76897D]">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b border-[#1C2B22] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#36E27B]">How it works</p>
              <h2 className="mt-3 font-mono text-3xl font-extrabold tracking-tight text-[#ECF7F0] sm:text-4xl">
                Get in, pick a call sign, set your keys, stay contained.
              </h2>
              <div className="mt-8 space-y-2.5">
                {howItWorksSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-4 rounded-md border border-[#1C2B22] bg-[#0C120F] p-3.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 font-mono text-[13px] font-extrabold text-[#36E27B]">
                      {index + 1}
                    </div>
                    <p className="text-[13px] leading-5 text-[#DCEAE1]">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-[#1E5C3C] bg-black/60 p-6 shadow-[0_0_40px_-16px_rgba(54,226,123,0.25)]">
              <div className="mb-4 flex items-center gap-3">
                <KeyRound className="h-6 w-6 text-[#36E27B]" />
                <h3 className="font-mono text-xl font-extrabold text-[#ECF7F0]">How key-locked messages work</h3>
              </div>
              <p className="text-[13px] leading-7 text-[#9FB2A6]">
                Encrypt your message or media, send it, and SecureChat gives you a one-time decryption key.
                Pass that key to your recipient through a separate channel. Without it, the payload stays
                locked. No key, no message.
              </p>
              <div className="mt-6 rounded-sm border border-[#6B4E16] bg-[#F2B43C]/[0.08] p-4 text-[12px] leading-6 text-[#F2D79B]">
                Built-in encryption and privacy tools reduce what you expose, but no tool replaces good
                judgment. Only share sensitive information with people you trust.
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-lg border border-[#1E5C3C] bg-[#0C120F] p-8 shadow-[0_0_50px_-18px_rgba(54,226,123,0.25)] md:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#36E27B]">Ready to go dark?</p>
              <h2 className="mt-3 font-mono text-2xl font-extrabold tracking-tight text-[#ECF7F0] sm:text-3xl">
                Create an account and send messages that stay yours.
              </h2>
              <p className="mt-3 text-[13px] leading-6 text-[#76897D]">
                Encryption on by default once your keys are set. Use key-locking when the payload needs
                another layer, and burn-after-read when the message should disappear after it is opened.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuthDialog('signup')}
              className="group inline-flex w-full items-center justify-center rounded-sm bg-[#36E27B] px-6 py-3.5 font-mono text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#06130B] shadow-[0_0_22px_rgba(54,226,123,0.22)] transition-all hover:bg-[#7BEFA9] md:w-auto"
            >
              Create Account
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#1C2B22] bg-[#070B09] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#4A5A50] sm:flex-row sm:items-center sm:justify-between">
          <span>SecureChat · Fortress {FORTRESS_VERSION} · by Johnathan Carlson</span>
          <span className="inline-flex items-center gap-2 text-[#5C6E63]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#36E27B]" />
            Firebase auth + enforced access rules + on-device keys
          </span>
        </div>
      </footer>

      {/* Auth Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-sm border-[#1E5C3C] bg-[#0C120F] font-mono text-[#DCEAE1] sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 shadow-[0_0_22px_rgba(54,226,123,0.25)]">
              <Shield className="h-7 w-7 text-[#36E27B]" />
            </div>
            <DialogTitle className="text-center font-mono text-xl font-extrabold uppercase tracking-[0.12em] text-[#ECF7F0]">
              {isLogin ? 'Access terminal' : 'Establish identity'}
            </DialogTitle>
            <DialogDescription className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#76897D]">
              {isLogin ? 'Sign in to your secure channel.' : 'Set up your secure workspace in seconds.'}
            </DialogDescription>
          </DialogHeader>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-sm border border-[#1C2B22] bg-[#0F1612] px-6 py-3.5 font-mono text-[13px] font-bold text-[#DCEAE1] transition-colors hover:border-[#1E5C3C] hover:bg-[#101814] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-[#1C2B22]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4A5A50]">or</span>
            <div className="h-px flex-1 bg-[#1C2B22]" />
          </div>

          <form onSubmit={handleAuth} className="space-y-3.5">
            {!isLogin && (
              <>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <User className="h-4 w-4 text-[#36E27B]" />
                  </div>
                  <input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    className={inputClass}
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <User className="h-4 w-4 text-[#36E27B]" />
                  </div>
                  <input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    className={inputClass}
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <UserCheck className="h-4 w-4 text-[#36E27B]" />
                  </div>
                  <input
                    placeholder="Call sign"
                    value={callSign}
                    onChange={(e) => setCallSign(e.target.value)}
                    required
                    autoComplete="username"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Mail className="h-4 w-4 text-[#36E27B]" />
              </div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Lock className="h-4 w-4 text-[#36E27B]" />
              </div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className={inputClass}
              />
            </div>

            {!isLogin && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-[#36E27B]" />
                </div>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!isLogin}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-sm bg-[#36E27B] px-6 py-3.5 font-mono text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#06130B] shadow-[0_0_18px_rgba(54,226,123,0.22)] transition-colors hover:bg-[#7BEFA9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowRight className="mr-2.5 h-4 w-4" />
              {loading ? 'PROCESSING...' : (isLogin ? 'SIGN IN' : 'CREATE ACCOUNT')}
            </button>
          </form>

          {success && (
            <div className="rounded-sm border border-[#1E5C3C] bg-[#36E27B]/10 p-3.5">
              <p className="font-mono text-[12px] text-[#7BEFA9]">{success}</p>
            </div>
          )}

          {error && (
            <div className="rounded-sm border border-[#5C2420] bg-[#FF6B61]/[0.08] p-3.5">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-[#FF6B61]">{error}</pre>
            </div>
          )}

          <div className="text-center">
            <p className="font-mono text-[12px] text-[#76897D]">
              {isLogin ? "No account?" : 'Already enlisted?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
                className="font-bold text-[#36E27B] transition-colors hover:text-[#7BEFA9]"
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
