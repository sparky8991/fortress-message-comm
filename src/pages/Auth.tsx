import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shield, LogIn, ShieldAlert } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
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
        }
      }
      
      setError(`// ERROR_CODE: ${errorCode}\n${detailedMessage}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl shadow-green-500/10">
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-green-500 flex-shrink-0" />
            <h1 className="text-3xl font-bold text-white font-mono tracking-tight">SecureChat</h1>
          </div>
          <p className="text-green-500 text-sm font-medium font-mono tracking-wide">MILITARY_GRADE_ENCRYPTION_ACTIVE</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <input
            type="email"
            placeholder="EMAIL_ADDRESS"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-green-400 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
          />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-green-400 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 bg-green-500 hover:bg-green-600 rounded-lg text-black font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
          >
            <LogIn className="w-5 h-5 mr-2" />
            {loading ? 'PROCESSING...' : isLogin ? 'SIGN_IN' : 'SIGN_UP'}
          </button>
        </form>

        {success && (
          <p className="mt-4 text-center text-green-400 bg-green-900/50 p-3 rounded-lg font-mono text-sm">{success}</p>
        )}

        {error && (
          <div className="mt-6 bg-black border border-red-700 rounded-lg p-4 font-mono text-sm text-red-400/90 shadow-lg shadow-red-500/10">
            <div className="flex items-center gap-x-2 border-b border-red-700/50 pb-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="font-bold text-red-500">SYSTEM_ALERT: AUTHENTICATION_FAILURE</span>
            </div>
            <pre className="whitespace-pre-wrap text-xs">{error}</pre>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-400 font-mono">
          {isLogin ? "DON'T_HAVE_ACCOUNT?" : 'ALREADY_HAVE_ACCOUNT?'}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
            }}
            className="ml-2 font-medium text-green-500 hover:underline font-mono"
          >
            {isLogin ? 'SIGN_UP' : 'SIGN_IN'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
