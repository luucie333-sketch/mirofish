'use client';

import { useState } from 'react';
import { X, Zap, Infinity, Star } from 'lucide-react';
import { CREDIT_PACKAGES, SUBSCRIPTION_PLAN } from '@/lib/credits';
import { useCredits } from '@/components/providers/CreditsProvider';
import PackageCard from './PackageCard';
import CryptoPayment from './CryptoPayment';
import PhantomCreditsCheckout from './PhantomCreditsCheckout';
import SubscriptionCheckout from './SubscriptionCheckout';
import PhantomSubscriptionCheckout from './PhantomSubscriptionCheckout';

type Mode = 'subscription' | 'credits';
type PayMethod = 'usdt' | 'sol';

export default function BuyCreditsModal() {
  const { credits, showBuyModal, setShowBuyModal, refresh, isSubscribed, subscriptionExpires } = useCredits();
  const [selectedPackage, setSelectedPackage] = useState('pro');
  const [mode, setMode] = useState<Mode>('subscription');
  const [payMethod, setPayMethod] = useState<PayMethod>('usdt');
  const [successMsg, setSuccessMsg] = useState('');

  if (!showBuyModal) return null;

  function handleClose() {
    setShowBuyModal(false);
    setSuccessMsg('');
  }

  function handleCryptoSuccess() {
    setSuccessMsg('Request submitted! Credits will be added after verification (1–24 hours).');
    setTimeout(handleClose, 3000);
  }

  async function handleSubscriptionSuccess() {
    await refresh();
    setSuccessMsg('Subscription request submitted! Will be activated after verification (1–24 hours).');
    setTimeout(handleClose, 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={handleClose} aria-hidden />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-mint" />
            <span className="font-display font-600 text-bright text-sm">Buy Credits</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-card transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Current balance */}
          {credits !== null && (
            <p className="font-mono text-xs text-muted text-center">
              {isSubscribed ? (
                <>
                  <span className="text-mint">∞ Unlimited</span> plan active —{' '}
                  expires {new Date(subscriptionExpires!).toLocaleDateString()}
                </>
              ) : (
                <>
                  Current balance:{' '}
                  <span className="text-mint font-600">{credits} credit{credits !== 1 ? 's' : ''}</span>
                </>
              )}
            </p>
          )}

          {/* Success message */}
          {successMsg && (
            <div className="bg-mint/10 border border-mint/20 rounded-xl px-4 py-3">
              <p className="font-mono text-xs text-mint text-center">{successMsg}</p>
            </div>
          )}

          {!successMsg && (
            <>
              {/* ── Subscription card (featured) ── */}
              <button
                type="button"
                onClick={() => setMode('subscription')}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  mode === 'subscription'
                    ? 'border-mint bg-mint/10'
                    : 'border-mint/30 bg-mint/5 hover:border-mint/50 hover:bg-mint/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Infinity className="w-4 h-4 text-mint shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-600 text-bright text-sm">
                          {SUBSCRIPTION_PLAN.label}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-mint/20 border border-mint/30 font-mono text-[10px] text-mint">
                          <Star className="w-2.5 h-2.5" />
                          Best value
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted mt-0.5">{SUBSCRIPTION_PLAN.description}</p>
                    </div>
                  </div>
                  <span className="font-display font-700 text-mint text-base shrink-0">
                    ${SUBSCRIPTION_PLAN.price}<span className="font-mono text-xs text-muted">/mo</span>
                  </span>
                </div>
                {isSubscribed && (
                  <p className="font-mono text-xs text-mint/70 mt-2">
                    ✓ Active — renew to extend by 30 more days
                  </p>
                )}
              </button>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="font-mono text-xs text-muted">or buy credits</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* ── Credit package cards ── */}
              <div className={`grid grid-cols-3 gap-2 transition-opacity ${isSubscribed ? 'opacity-50' : ''}`}>
                {CREDIT_PACKAGES.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={mode === 'credits' && selectedPackage === pkg.id}
                    onSelect={() => { setMode('credits'); setSelectedPackage(pkg.id); }}
                  />
                ))}
              </div>
              {isSubscribed && (
                <p className="font-mono text-xs text-muted/60 text-center -mt-1">
                  You have unlimited access — credits usable after subscription expires
                </p>
              )}

              {/* ── Payment method tabs (shared) ── */}
              <div className="flex gap-1 p-1 bg-card rounded-xl">
                {(['usdt', 'sol'] as PayMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`flex-1 py-2 rounded-lg font-display font-600 text-xs transition-all ${
                      payMethod === m
                        ? 'bg-surface text-bright shadow-card'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {m === 'usdt' ? 'USDT' : 'SOL (Phantom)'}
                  </button>
                ))}
              </div>

              {/* ── Payment area ── */}
              <div className="min-h-[160px]">
                {mode === 'subscription' ? (
                  payMethod === 'usdt' ? (
                    <SubscriptionCheckout onSuccess={handleSubscriptionSuccess} />
                  ) : (
                    <PhantomSubscriptionCheckout onSuccess={handleSubscriptionSuccess} />
                  )
                ) : (
                  payMethod === 'usdt' ? (
                    <CryptoPayment packageId={selectedPackage} onSuccess={handleCryptoSuccess} />
                  ) : (
                    <PhantomCreditsCheckout packageId={selectedPackage} onSuccess={handleCryptoSuccess} />
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
