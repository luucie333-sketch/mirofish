'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Zap, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCredits } from '@/components/providers/CreditsProvider';
import type { User } from '@supabase/supabase-js';

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { credits, setShowBuyModal } = useCredits();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-mint text-bg hover:bg-mint-dim shadow-glow-mint transition-all duration-200 font-display font-600"
      >
        Sign In
      </Link>
    );
  }

  async function signOut() {
    await fetch('/auth/signout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-card transition-all text-sm"
      >
        {/* Credit badge */}
        <span className="inline-flex items-center gap-1 font-mono text-xs text-mint">
          <Zap className="w-3 h-3" />
          {credits ?? '…'}
        </span>
        <span className="w-px h-4 bg-border" />
        <span className="font-mono text-xs text-muted max-w-[120px] truncate">
          {user.email}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-card py-1 z-50">
          <button
            type="button"
            onClick={() => { setShowBuyModal(true); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-card transition-colors font-body"
          >
            <Zap className="w-4 h-4 text-mint shrink-0" />
            Buy Credits
          </button>
          <div className="h-px bg-border mx-2 my-1" />
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-coral hover:bg-card transition-colors font-body"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
