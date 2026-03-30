'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CreditsContextValue {
  credits: number | null;
  subscription: string | null;
  subscriptionExpires: string | null;
  isSubscribed: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  showBuyModal: boolean;
  setShowBuyModal: (v: boolean) => void;
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: null,
  subscription: null,
  subscriptionExpires: null,
  isSubscribed: false,
  loading: false,
  refresh: async () => {},
  showBuyModal: false,
  setShowBuyModal: () => {},
});

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<string | null>(null);
  const [subscriptionExpires, setSubscriptionExpires] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const supabase = createClient();

  const isSubscribed = useMemo(
    () =>
      subscription === 'unlimited' &&
      subscriptionExpires !== null &&
      new Date(subscriptionExpires) > new Date(),
    [subscription, subscriptionExpires]
  );

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setCredits(null);
      setSubscription(null);
      setSubscriptionExpires(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/credits/balance');
      if (res.ok) {
        const { credits: c, subscription: sub, subscriptionExpires: subExp } = await res.json();
        setCredits(c);
        setSubscription(sub ?? null);
        setSubscriptionExpires(subExp ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => authSub.unsubscribe();
  }, [refresh, supabase]);

  return (
    <CreditsContext.Provider
      value={{ credits, subscription, subscriptionExpires, isSubscribed, loading, refresh, showBuyModal, setShowBuyModal }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
