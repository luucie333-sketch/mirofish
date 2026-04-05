'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Clock } from 'lucide-react';
import { useCredits } from '@/components/providers/CreditsProvider';
import { SUBSCRIPTION_PLAN } from '@/lib/credits';

interface SubscriptionCheckoutProps {
  onSuccess: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="p-1.5 rounded-lg text-muted hover:text-mint hover:bg-mint/10 transition-colors"
      title="Copy address"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-mint" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function SubscriptionCheckout({ onSuccess }: SubscriptionCheckoutProps) {
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { refresh } = useCredits();

  const address = process.env.NEXT_PUBLIC_USDT_TRC20_WALLET ?? '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!txHash.trim()) return;
    setStatus('submitting');

    const res = await fetch('/api/payments/crypto/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: 'subscription', walletType: 'USDT', txHash }),
    });

    if (res.ok) {
      setStatus('submitted');
      await refresh();
      onSuccess();
    } else {
      const { error } = await res.json();
      setErrorMsg(error ?? 'Submission failed');
      setStatus('error');
    }
  }

  if (status === 'submitted') {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="w-12 h-12 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6 text-mint" />
        </div>
        <div>
          <p className="font-display font-600 text-bright text-sm">Request submitted</p>
          <p className="font-mono text-xs text-muted mt-1">
            Manual verification usually takes 1–24 hours. Subscription will be activated once confirmed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-muted text-center">
        Send <span className="text-bright">${SUBSCRIPTION_PLAN.price} USDT (TRC-20)</span> for{' '}
        <span className="text-mint">30 days of unlimited predictions</span>
      </p>

      {/* Wallet address + QR */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted">USDT (TRC-20)</span>
          <span className="font-mono text-xs text-amber">${SUBSCRIPTION_PLAN.price}</span>
        </div>

        {address ? (
          <>
            <div className="flex justify-center">
              <div className="p-2 bg-white rounded-lg">
                <QRCodeSVG value={address} size={120} />
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
              <span className="flex-1 font-mono text-xs text-text break-all">{address}</span>
              <CopyButton text={address} />
            </div>
          </>
        ) : (
          <p className="font-mono text-xs text-muted/60 text-center">
            Wallet address not configured
          </p>
        )}
      </div>

      {/* TX hash form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block font-mono text-xs text-muted mb-2 uppercase tracking-widest">
            Transaction Hash
          </label>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Paste your tx hash here…"
            required
            disabled={status === 'submitting'}
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 font-mono text-xs text-text placeholder:text-muted/50 focus:outline-none focus:border-mint/40 transition-colors disabled:opacity-60"
          />
        </div>

        {status === 'error' && (
          <p className="text-coral text-xs font-mono">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={!txHash.trim() || status === 'submitting'}
          className="w-full flex items-center justify-center gap-2 bg-mint text-bg font-display font-600 text-sm px-4 py-2.5 rounded-xl hover:bg-mint-dim shadow-glow-mint transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'submitting' ? (
            <div className="w-4 h-4 rounded-full border-2 border-bg border-t-transparent animate-spin" />
          ) : (
            'Submit Payment'
          )}
        </button>
      </form>

      <p className="font-mono text-xs text-muted/50 text-center">
        Manual verification usually takes 1–24 hours.
      </p>
    </div>
  );
}
