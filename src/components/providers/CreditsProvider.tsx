'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CreditsContextValue {
  credits: number | null;
  loading: boolean;
  refresh: () => Promise<void>;
  showBuyModal: boolean;
  setShowBuyModal: (v: boolean) => void;
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: null,
  loading: false,
  refresh: async () => {},
  showBuyModal: false,
  setShowBuyModal: () => {},
});

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCredits(null); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/credits/balance');
      if (res.ok) {
        const { credits: c } = await res.json();
        setCredits(c);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh, supabase]);

  return (
    <CreditsContext.Provider value={{ credits, loading, refresh, showBuyModal, setShowBuyModal }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
