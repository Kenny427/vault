'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
          },
        });
        if (error) throw error;
        setError('Sign up successful! Check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-osrs-accent rounded" />
            <h1 className="text-2xl font-semibold text-slate-100">Vault</h1>
          </div>

          <h2 className="text-xl font-semibold text-slate-100 mb-6">
            {isSignup ? 'Create Account' : 'Sign In'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-osrs-accent"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-osrs-accent"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-osrs-accent hover:bg-osrs-accent/90 text-slate-900 font-semibold rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-slate-400 hover:text-slate-300"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
