'use client';

import { Zap } from 'lucide-react';
import { useCredits } from '@/components/providers/CreditsProvider';

export default function CreditBadge() {
  const { credits, setShowBuyModal } = useCredits();

  if (credits === null) return null;

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
