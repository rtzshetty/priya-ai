import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, ArrowRight, ArrowLeft, Mail, Lock } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  updateProfile 
} from 'firebase/auth';

interface WelcomeScreenProps {
  onNameSubmit: (name: string) => void;
}

export default function WelcomeScreen({ onNameSubmit }: WelcomeScreenProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingUser, setPendingUser] = useState<{email: string, name: string} | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const deriveNameFromEmail = (emailAddress: string) => {
    let derived = emailAddress.split('@')[0];
    derived = derived.split(/[._+-]/)[0];
    if (!derived) return "User";
    return derived.charAt(0).toUpperCase() + derived.slice(1);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.app) {
      setError('Firebase configuration is missing. Please add VITE_FIREBASE_API_KEY to your environment variables or continue as Guest.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    
    if (!trimmedEmail || !trimmedPassword) {
      setError('Email and password are required');
      return;
    }

    if (isLogin) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        
        if (!userCredential.user.emailVerified) {
          setError('Please verify your email address. Check your inbox for the link.');
          return;
        }
        
        setError('');
        onNameSubmit(userCredential.user.displayName || deriveNameFromEmail(trimmedEmail));
      } catch (err: any) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          setError('Incorrect email or password.');
        } else if (err.code === 'auth/user-not-found') {
          setError('No account found with this email. Please sign up.');
        } else {
          setError(err.message || 'Failed to sign in');
        }
      }
    } else {
      try {
        let finalName = name.trim();
        if (!finalName) {
          finalName = deriveNameFromEmail(trimmedEmail);
        }

        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        await updateProfile(userCredential.user, { displayName: finalName });
        await sendEmailVerification(userCredential.user);

        setPendingUser({
          email: trimmedEmail,
          name: finalName
        });
        setIsVerifying(true);
        setError('');
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setError('Account already exists. Please sign in.');
        } else if (err.code === 'auth/weak-password') {
          setError('Password should be at least 6 characters.');
        } else {
          setError(err.message || 'Failed to sign up');
        }
      }
    }
  };

  const handleVerifyCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setError('');
        onNameSubmit(auth.currentUser.displayName || pendingUser?.name || 'User');
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } else {
      setError('Session lost. Please try signing in again.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth.app) {
      setError('Firebase configuration is missing. Please add VITE_FIREBASE_API_KEY to your environment variables or continue as Guest.');
      return;
    }
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Attempt to derive a clean first name from display name or email
      let finalName = 'User';
      if (result.user.displayName) {
        finalName = result.user.displayName.split(' ')[0];
      } else if (result.user.email) {
        let derived = result.user.email.split('@')[0];
        derived = derived.split(/[._+-]/)[0];
        finalName = derived.charAt(0).toUpperCase() + derived.slice(1);
      }
      
      setError('');
      onNameSubmit(finalName);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Failed to sign in with Google');
      }
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNameSubmit(name.trim() || 'Guest');
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-violet-900/20 blur-[80px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-pink-900/20 blur-[80px] rounded-full" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-xl max-w-sm w-full mx-4 flex flex-col items-center shadow-2xl"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center font-bold text-2xl mb-6 shadow-lg shadow-violet-500/20">
          P
        </div>
        
        {isGuestMode ? (
          <>
            <h1 className="text-2xl font-serif font-medium tracking-wide mb-2 text-center">
              Welcome, Guest.
            </h1>
            <p className="text-white/50 text-sm text-center mb-8">
              What should I call you?
            </p>
            
            <form onSubmit={handleGuestSubmit} className="w-full flex flex-col gap-4 items-center">
              <div className="relative w-full">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 transition-colors text-sm"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all rounded-2xl flex items-center justify-center gap-2 font-medium text-sm mt-2"
              >
                Start Conversation
                <ArrowRight size={16} />
              </button>
            </form>
            
            <button
              onClick={() => setIsGuestMode(false)}
              className="mt-6 text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </>
        ) : isVerifying ? (
          <>
            <h1 className="text-2xl font-serif font-medium tracking-wide mb-2 text-center">
              Verify your email.
            </h1>
            <p className="text-white/50 text-sm text-center mb-8">
              We've sent a verification link to <strong>{pendingUser?.email}</strong>.
              <br/>
              <span className="text-xs text-violet-300/50 mt-1 block">Please check your inbox and click the link to continue.</span>
            </p>
            
            <form onSubmit={handleVerifyCheck} className="w-full flex flex-col gap-4 items-center">
              {error && (
                <p className="w-full text-red-400 text-xs text-center bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 transition-all rounded-2xl flex items-center justify-center gap-2 font-medium text-sm mt-2"
              >
                I have verified my email
                <ArrowRight size={16} />
              </button>
            </form>

            <button
              onClick={() => {
                setIsVerifying(false);
                setError('');
              }}
              className="mt-6 text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back to Sign In
            </button>
          </>
        ) : showEmailForm ? (
          <>
            <h1 className="text-2xl font-serif font-medium tracking-wide mb-2 text-center">
              {isLogin ? 'Welcome back.' : 'Hello there.'}
            </h1>
            <p className="text-white/50 text-sm text-center mb-6">
              {isLogin ? 'Sign in to continue your conversation.' : 'Sign up to begin your conversation with Priya.'}
            </p>
            
            <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-4 items-center">
              {!isLogin && (
                <div className="relative w-full">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Name (Optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 transition-colors text-sm"
                  />
                </div>
              )}

              <div className="relative w-full">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Email address"
                  className={`w-full bg-white/5 border ${error && error.toLowerCase().includes('email') ? 'border-red-500/50' : 'border-white/10'} rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 transition-colors text-sm`}
                  required
                />
              </div>

              <div className="relative w-full">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Password"
                  className={`w-full bg-white/5 border ${error && error.toLowerCase().includes('password') ? 'border-red-500/50' : 'border-white/10'} rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 transition-colors text-sm`}
                  required
                />
              </div>
              
              {error && (
                <p className="w-full text-red-400 text-xs text-center bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">{error}</p>
              )}

              <button
                type="submit"
                disabled={!email.trim() || !password.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all rounded-2xl flex items-center justify-center gap-2 font-medium text-sm mt-2"
              >
                {isLogin ? 'Sign In' : 'Sign Up'}
                <ArrowRight size={16} />
              </button>
            </form>

            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-xs text-white/40 hover:text-white/80 transition-colors mt-4"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>

            <button
              onClick={() => {
                setShowEmailForm(false);
                setError('');
              }}
              className="mt-6 text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-serif font-medium tracking-wide mb-2 text-center">
              Hello there.
            </h1>
            <p className="text-white/50 text-sm text-center mb-6">
              Choose a way to sign in and begin your conversation.
            </p>

            <div className="w-full flex flex-col gap-4 items-center">
              {error && (
                <p className="w-full text-red-400 text-xs text-center bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">{error}</p>
              )}
              
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-3 bg-white hover:bg-gray-100 text-black transition-all rounded-2xl flex items-center justify-center gap-3 font-medium text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => {
                  setShowEmailForm(true);
                  setError('');
                }}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-2xl flex items-center justify-center gap-3 font-medium text-sm"
              >
                <Mail size={18} />
                Continue with Email
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 mt-6 w-full">
              <div className="w-full flex items-center gap-3 my-2 opacity-30">
                <div className="flex-1 h-px bg-white" />
                <span className="text-[10px] uppercase tracking-widest text-white font-medium">OR</span>
                <div className="flex-1 h-px bg-white" />
              </div>

              <button
                onClick={() => {
                  setError('');
                  setIsGuestMode(true);
                  setName('');
                }}
                className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-2xl flex items-center justify-center gap-2 font-medium text-sm text-white/70 hover:text-white"
              >
                Continue as Guest
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
