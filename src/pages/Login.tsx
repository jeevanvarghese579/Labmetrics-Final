import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { AlertCircle, Building2, CheckCircle2, Loader2, Lock, Mail } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  checkCurrentUserAccess,
  requestCurrentUserAccess,
  type AccessResult,
} from '../authorization';

interface LoginProps {
  user: User | null;
  access: AccessResult | null;
  accessState: string;
  accessError: string;
  onCheckAgain: () => void;
}

function friendlyError(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for this email. Sign in instead.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase Authentication.',
  };
  return messages[code] || fallback;
}

export default function Login({ user, access, accessState, accessError, onCheckAgain }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [requestPending, setRequestPending] = useState(access?.requestStatus === 'pending');

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      if (mode === 'sign-in') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const policy = await checkCurrentUserAccess(credential.user);
        if (!policy.allowed && policy.requireEmailVerification && !credential.user.emailVerified) {
          await sendEmailVerification(credential.user);
          setMessage('Account created. Check your inbox to verify your email, then select Check Again.');
        } else {
          setMessage('Account created. You can now request access.');
        }
      }
    } catch (err) {
      setError(friendlyError(err, mode === 'sign-in' ? 'Failed to sign in.' : 'Failed to create the account.'));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(friendlyError(err, 'Google sign-in failed.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage('Password reset email sent.');
    } catch (err) {
      setError(friendlyError(err, 'Could not send the password reset email.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestCurrentUserAccess('access-request');
      setRequestPending(true);
      setMessage('Your access request is awaiting administrator approval.');
    } catch (err) {
      setError(friendlyError(err, 'Could not submit the access request.'));
    } finally {
      setBusy(false);
    }
  };

  const handleVerification = async () => {
    if (!auth.currentUser) return;
    setBusy(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage('Verification email sent. Open the link, then select Check Again.');
    } catch (err) {
      setError(friendlyError(err, 'Could not send the verification email.'));
    } finally {
      setBusy(false);
    }
  };

  const pending = requestPending || access?.requestStatus === 'pending';
  const rejected = access?.requestStatus === 'rejected';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LabMetrics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to access your dashboard</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          {(error || accessError) && (
            <div className="flex items-start gap-3 p-4 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error || accessError}</p>
            </div>
          )}
          {message && (
            <div className="flex items-start gap-3 p-4 mb-5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <p className="text-sm text-teal-700 dark:text-teal-300">{message}</p>
            </div>
          )}

          {user ? (
            <div className="space-y-5">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{user.displayName || user.email}</p>
                <p className="text-sm text-gray-500 mt-1">Your account does not currently have access to this application.</p>
              </div>
              {pending && <p className="text-sm text-amber-700 dark:text-amber-300">Your access request is awaiting administrator approval.</p>}
              {rejected && <p className="text-sm text-red-600 dark:text-red-400">Your request was rejected for this application.</p>}
              {accessState === 'verification-required' ? (
                <button onClick={handleVerification} disabled={busy} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg disabled:opacity-50">
                  Send Verification Email
                </button>
              ) : !pending && !rejected ? (
                <button onClick={handleRequest} disabled={busy} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg disabled:opacity-50">
                  {busy ? 'Sending…' : 'Request Access'}
                </button>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={onCheckAgain} disabled={busy} className="py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 disabled:opacity-50">Check Again</button>
                <button onClick={() => void signOut(auth)} disabled={busy} className="py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 disabled:opacity-50">Sign Out</button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={handleGoogle} disabled={busy} className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                <span className="font-bold text-blue-600">G</span> Continue with Google
              </button>
              <div className="my-6 flex items-center gap-4"><div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" /><span className="text-sm text-gray-500">or</span><div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" /></div>
              <form onSubmit={handleEmailAuth} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500" /></div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} placeholder="••••••••" className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500" /></div>
                </div>
                {mode === 'sign-in' && <button type="button" onClick={handleReset} className="text-sm text-teal-600 hover:text-teal-700">Forgot password?</button>}
                <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg disabled:opacity-50">
                  {busy && <Loader2 className="w-5 h-5 animate-spin" />}{mode === 'sign-in' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
                {mode === 'sign-in' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); }} className="font-medium text-teal-600 hover:text-teal-700">
                  {mode === 'sign-in' ? 'Create one now' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">© 2026 LabMetrics. All rights reserved.</p>
      </div>
    </div>
  );
}
