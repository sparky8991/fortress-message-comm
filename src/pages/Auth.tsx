
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let authError;
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        authError = error;
      } else {
        // Validate signup form
        const validationError = validateSignupForm();
        if (validationError) {
          setError(`// ERROR_CODE: VALIDATION_ERROR\n${validationError}`);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              call_sign: callSign.trim(),
            },
          },
        });
        authError = error;
      }

      if (authError) {
        throw authError;
      }
      
      if (isLogin) {
        navigate('/');
      } else {
        setSuccess("Registration successful! Please check your email for a verification link to activate your account.");
      }
    } catch (err: any) {
      const errorMessage = err.message;
      let errorCode = "AUTH_FAILURE";
      let detailedMessage = "An unexpected error occurred. Please try again.";

      if (isLogin) {
        if (errorMessage.includes("Email not confirmed")) {
          errorCode = "EMAIL_NOT_VERIFIED";
          detailedMessage = "Account not active. Please check your inbox for a verification email. A new one has been sent.";
          await supabase.auth.resend({ type: 'signup', email });
        } else if (errorMessage.includes("Invalid login credentials")) {
          errorCode = "INVALID_CREDENTIALS";
          detailedMessage = "Access denied. Incorrect email or password.";
        }
      } else { // Sign up
        if (errorMessage.includes("User already registered")) {
          errorCode = "USER_ALREADY_EXISTS";
          detailedMessage = "Registration failed. An account with this email already exists.";
        } else if (errorMessage.includes("Password should be at least 6 characters")) {
          errorCode = "WEAK_PASSWORD";
          detailedMessage = "Registration failed. Password does not meet security requirements (min. 6 characters).";
        } else if (errorMessage.includes("Unable to validate email address")) {
            errorCode = "INVALID_EMAIL_FORMAT";
            detailedMessage = "Registration failed. The provided email address is not valid.";
        } else if (errorMessage.includes("duplicate key value violates unique constraint")) {
          errorCode = "CALL_SIGN_TAKEN";
          detailedMessage = "Registration failed. This call sign is already taken. Please choose a different one.";
        }
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

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

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

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-6">
          {/* Signup-only fields */}
          {!isLogin && (
            <>
              {/* First Name Input */}
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

              {/* Last Name Input */}
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

              {/* Call Sign Input */}
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

          {/* Email Input */}
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

          {/* Password Input */}
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

          {/* Confirm Password Input - Signup only */}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-4 px-6 bg-green-500 hover:bg-green-600 rounded-xl text-slate-900 font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-6 h-6 mr-3" />
            {loading ? 'PROCESSING...' : (isLogin ? 'SIGN IN' : 'SIGN UP')}
          </button>
        </form>

        {/* Success Message */}
        {success && (
          <div className="mt-6 p-4 bg-green-900/50 border border-green-700 rounded-xl">
            <p className="text-green-400 text-sm font-mono">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-xl">
            <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {/* Toggle Link */}
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
