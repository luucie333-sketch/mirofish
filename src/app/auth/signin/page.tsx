'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, Zap } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg('');

    // Check if this IP can create a new account (existing users always pass)
    try {
      const ipCheck = await fetch('/api/auth/check-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const { blocked, message } = await ipCheck.json();

      if (blocked) {
        setErrorMsg(
          message ??
            'An account was already created from this network. Please sign in with your existing email.'
        );
        setStatus('error');
        return;
      }
    } catch {
      // IP check failure is non-fatal — proceed with sign-in
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      {/* background radials */}
      <div className="bg-radial-mint absolute inset-0 pointer-events-none" aria-hidden />
      <div className="bg-radial-coral absolute inset-0 pointer-events-none" aria-hidden />
      <div className="bg-grid absolute inset-0 opacity-40 pointer-events-none" aria-hidden />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 justify-center select-none">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden>
            <polygon points="2,2 2,18 22,10" fill="#64FFDA" opacity="0.9" />
            <polygon points="22,4 22,16 27,10" fill="#64FFDA" opacity="0.55" />
          </svg>
          <span className="font-display font-700 text-xl text-bright">MiroFish</span>
          <span className="font-mono text-xs text-mint/60">.us</span>
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-card">
          {status === 'sent' ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7 text-mint" />
              </div>
              <div>
                <h2 className="font-display font-700 text-bright text-xl mb-2">Check your email</h2>
                <p className="text-muted text-sm leading-relaxed">
                  We sent a magic link to <span className="text-text font-medium">{email}</span>.
                  Click it to sign in.
                </p>
              </div>
              <p className="font-mono text-xs text-muted/60">
                No email? Check spam or{' '}
                <button
                  onClick={() => setStatus('idle')}
                  className="text-mint hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="font-display font-700 text-bright text-2xl mb-1">Sign in</h1>
                <p className="text-muted text-sm">
                  Enter your email — we&apos;ll send you a magic link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block font-mono text-xs text-muted mb-2 uppercase tracking-widest">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={status === 'loading'}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-text text-sm placeholder:text-muted/50 focus:outline-none focus:border-mint/40 transition-colors disabled:opacity-60"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-coral text-xs font-mono leading-relaxed">
                    {errorMsg || 'Something went wrong. Please try again.'}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading' || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-mint text-bg font-display font-600 text-sm px-4 py-3 rounded-xl hover:bg-mint-dim shadow-glow-mint transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-bg border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Send Magic Link
                    </>
                  )}
                </button>
              </form>

              <p className="text-center font-mono text-xs text-muted/50 mt-6">
                No password needed. Just your email.
              </p>
            </>
          )}
        </div>

        <Link
          href="/"
          className="flex items-center gap-1.5 justify-center mt-6 font-mono text-xs text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
