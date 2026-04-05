'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const purchaseRequired = searchParams.get('buy') === '1';

  useEffect(() => {
    if (purchaseRequired) setShowBuyModal(true);
  }, [purchaseRequired, setShowBuyModal]);

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
          {/* Purchase required banner */}
          {purchaseRequired && !successMsg && (
            <div className="bg-amber/10 border border-amber/20 rounded-xl px-4 py-3">
              <p className="font-mono text-xs text-amber text-center">
                Purchase credits to get started with MiroFish
              </p>
            </div>
          )}

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
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest text-center">
                  Choose payment method
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* USDT tab */}
                  <button
                    type="button"
                    onClick={() => setPayMethod('usdt')}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 font-display font-600 text-sm transition-all ${
                      payMethod === 'usdt'
                        ? 'bg-mint border-mint text-bg shadow-glow-mint'
                        : 'bg-card border-border text-muted hover:border-mint/40 hover:text-text'
                    }`}
                  >
                    {/* Tether (USDT) logo */}
                    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
                      <circle cx="16" cy="16" r="16" fill={payMethod === 'usdt' ? '#07070F' : '#26A17B'} />
                      <path d="M18.16 10.24H13.84V13.12H8V15.36H24V13.12H18.16V10.24Z" fill={payMethod === 'usdt' ? '#26A17B' : '#fff'} />
                      <path d="M16 16.32C12.48 16.32 9.6 15.68 9.6 14.88C9.6 14.08 12.48 13.44 16 13.44C19.52 13.44 22.4 14.08 22.4 14.88C22.4 15.68 19.52 16.32 16 16.32Z" fill={payMethod === 'usdt' ? '#26A17B' : '#fff'} />
                      <path d="M16 16.96C12.16 16.96 9.12 16.22 9.12 15.36V18.56C9.12 19.42 12.16 20.16 16 20.16C19.84 20.16 22.88 19.42 22.88 18.56V15.36C22.88 16.22 19.84 16.96 16 16.96Z" fill={payMethod === 'usdt' ? '#26A17B' : '#fff'} />
                      <path d="M16 20.8C12.16 20.8 9.12 20.06 9.12 19.2V22.4C9.12 23.26 12.16 24 16 24C19.84 24 22.88 23.26 22.88 22.4V19.2C22.88 20.06 19.84 20.8 16 20.8Z" fill={payMethod === 'usdt' ? '#26A17B' : '#fff'} />
                    </svg>
                    USDT
                  </button>

                  {/* SOL (Phantom) tab */}
                  <button
                    type="button"
                    onClick={() => setPayMethod('sol')}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 font-display font-600 text-sm transition-all ${
                      payMethod === 'sol'
                        ? 'bg-mint border-mint text-bg shadow-glow-mint'
                        : 'bg-card border-border text-muted hover:border-mint/40 hover:text-text'
                    }`}
                  >
                    {/* Solana logo */}
                    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
                      <circle cx="16" cy="16" r="16" fill={payMethod === 'sol' ? '#07070F' : '#9945FF'} />
                      <path d="M9 21.5l1.8-1.8h12.4l-1.8 1.8H9Z" fill={payMethod === 'sol' ? '#9945FF' : '#fff'} />
                      <path d="M9 16l1.8-1.8h12.4L21.4 16H9Z" fill={payMethod === 'sol' ? '#9945FF' : '#fff'} />
                      <path d="M9 10.5l1.8-1.8h12.4l-1.8 1.8H9Z" fill={payMethod === 'sol' ? '#9945FF' : '#fff'} />
                    </svg>
                    SOL
                  </button>
                </div>
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
