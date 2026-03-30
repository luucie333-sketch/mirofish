'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Clock } from 'lucide-react';
import { CREDIT_PACKAGES } from '@/lib/credits';

interface CryptoPaymentProps {
  packageId: string;
  onSuccess: () => void;
}

const WALLETS = [
  { type: 'BTC', label: 'Bitcoin', envKey: 'NEXT_PUBLIC_BTC_WALLET' as const },
  { type: 'ETH', label: 'Ethereum', envKey: 'NEXT_PUBLIC_ETH_WALLET' as const },
  { type: 'USDT', label: 'USDT (TRC-20)', envKey: 'NEXT_PUBLIC_USDT_TRC20_WALLET' as const },
];

function getWalletAddress(envKey: string): string {
  if (envKey === 'NEXT_PUBLIC_BTC_WALLET') return process.env.NEXT_PUBLIC_BTC_WALLET ?? '';
  if (envKey === 'NEXT_PUBLIC_ETH_WALLET') return process.env.NEXT_PUBLIC_ETH_WALLET ?? '';
  if (envKey === 'NEXT_PUBLIC_USDT_TRC20_WALLET') return process.env.NEXT_PUBLIC_USDT_TRC20_WALLET ?? '';
  return '';
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

export default function CryptoPayment({ packageId, onSuccess }: CryptoPaymentProps) {
  const [selectedWallet, setSelectedWallet] = useState('BTC');
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  const wallet = WALLETS.find((w) => w.type === selectedWallet)!;
  const address = getWalletAddress(wallet.envKey);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!txHash.trim()) return;
    setStatus('submitting');

    const res = await fetch('/api/payments/crypto/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId, walletType: selectedWallet, txHash }),
    });

    if (res.ok) {
      setStatus('submitted');
      onSuccess();
    } else {
      const { error } = await res.json();
      setErrorMsg(error ?? 'Submission failed');
      setStatus('error');
    }
  }

  if (!pkg) return null;

  if (status === 'submitted') {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="w-12 h-12 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6 text-mint" />
        </div>
        <div>
          <p className="font-display font-600 text-bright text-sm">Request submitted</p>
          <p className="font-mono text-xs text-muted mt-1">
            Manual verification usually takes 1–24 hours. Credits will be added once confirmed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Wallet selector */}
      <div className="flex gap-2">
        {WALLETS.map((w) => (
          <button
            key={w.type}
            type="button"
            onClick={() => setSelectedWallet(w.type)}
            className={`flex-1 py-2 rounded-lg border font-mono text-xs transition-all ${
              selectedWallet === w.type
                ? 'border-mint/40 bg-mint/10 text-mint'
                : 'border-border text-muted hover:border-border/80 hover:text-text'
            }`}
          >
            {w.type}
          </button>
        ))}
      </div>

      {/* Wallet address + QR */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted">{wallet.label}</span>
          <span className="font-mono text-xs text-amber">${pkg.price}</span>
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
