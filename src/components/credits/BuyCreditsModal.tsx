'use client';

import { useState } from 'react';
import { X, Zap } from 'lucide-react';
import { CREDIT_PACKAGES } from '@/lib/credits';
import { useCredits } from '@/components/providers/CreditsProvider';
import PackageCard from './PackageCard';
import PayPalCheckout from './PayPalCheckout';
import CryptoPayment from './CryptoPayment';

type Tab = 'paypal' | 'crypto';

export default function BuyCreditsModal() {
  const { credits, showBuyModal, setShowBuyModal, refresh } = useCredits();
  const [selectedPackage, setSelectedPackage] = useState('pro');
  const [tab, setTab] = useState<Tab>('paypal');
  const [successMsg, setSuccessMsg] = useState('');

  if (!showBuyModal) return null;

  function handleClose() {
    setShowBuyModal(false);
    setSuccessMsg('');
  }

  async function handlePayPalSuccess() {
    await refresh();
    setSuccessMsg('Payment successful! Credits added to your account.');
    setTimeout(handleClose, 2500);
  }

  function handleCryptoSuccess() {
    setSuccessMsg('Request submitted! Credits will be added after verification (1–24 hours).');
    setTimeout(handleClose, 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

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

        <div className="p-6 space-y-5">
          {/* Current balance */}
          {credits !== null && (
            <p className="font-mono text-xs text-muted text-center">
              Current balance:{' '}
              <span className="text-mint font-600">{credits} credit{credits !== 1 ? 's' : ''}</span>
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
              {/* Package cards */}
              <div className="grid grid-cols-3 gap-2">
                {CREDIT_PACKAGES.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={selectedPackage === pkg.id}
                    onSelect={() => setSelectedPackage(pkg.id)}
                  />
                ))}
              </div>

              {/* Payment tabs */}
              <div className="flex gap-1 p-1 bg-card rounded-xl">
                {(['paypal', 'crypto'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 rounded-lg font-display font-600 text-xs transition-all ${
                      tab === t
                        ? 'bg-surface text-bright shadow-card'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {t === 'paypal' ? 'PayPal' : 'Crypto'}
                  </button>
                ))}
              </div>

              {/* Payment content */}
              <div className="min-h-[160px]">
                {tab === 'paypal' ? (
                  <PayPalCheckout
                    packageId={selectedPackage}
                    onSuccess={handlePayPalSuccess}
                  />
                ) : (
                  <CryptoPayment
                    packageId={selectedPackage}
                    onSuccess={handleCryptoSuccess}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
