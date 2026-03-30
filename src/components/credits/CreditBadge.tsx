'use client';

import { Zap, Infinity } from 'lucide-react';
import { useCredits } from '@/components/providers/CreditsProvider';

export default function CreditBadge() {
  const { credits, isSubscribed, setShowBuyModal } = useCredits();

  if (credits === null) return null;

  if (isSubscribed) {
    return (
      <button
        onClick={() => setShowBuyModal(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-mint/30 bg-mint/10 hover:bg-mint/20 hover:border-mint/50 transition-all font-mono text-xs text-mint"
        title="Unlimited plan active"
      >
        <Infinity className="w-3 h-3" />
        Unlimited
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowBuyModal(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-mint/20 bg-mint/5 hover:bg-mint/10 hover:border-mint/40 transition-all font-mono text-xs text-mint"
      title="Buy more credits"
    >
      <Zap className="w-3 h-3" />
      {credits}
    </button>
  );
}
