'use client';

import { useState } from 'react';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { useCredits } from '@/components/providers/CreditsProvider';
import { CREDIT_PACKAGES } from '@/lib/credits';

const DESTINATION_WALLET = '6rtUtvia4cGAxFn6WTuH8d56HgrA6m9DYLQy2ExKXuM5';
const PRICE_BUFFER = 1.015;
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

type Phase = 'idle' | 'connecting' | 'pricing' | 'ready' | 'sending' | 'confirming' | 'done' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPhantom(): any | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);
}

interface PhantomCreditsCheckoutProps {
  packageId: string;
  onSuccess: () => void;
}

export default function PhantomCreditsCheckout({ packageId, onSuccess }: PhantomCreditsCheckoutProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solAmount, setSolAmount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { refresh } = useCredits();

  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  const phantomInstalled = getPhantom() !== null;

  function setError(msg: string) {
    setErrorMsg(msg);
    setPhase('error');
  }

  function reset() {
    setPhase('idle');
    setWalletAddress(null);
    setSolAmount(null);
    setSolPrice(null);
    setErrorMsg('');
  }

  async function fetchSolPrice(): Promise<number> {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    if (!res.ok) throw new Error('Failed to fetch SOL price');
    const data = await res.json();
    return data.solana.usd as number;
  }

  async function handleConnect() {
    const phantom = getPhantom();
    if (!phantom) return setError('Phantom wallet not found.');
    if (!pkg) return;

    try {
      setPhase('connecting');
      const { publicKey } = await phantom.connect();
      setWalletAddress(publicKey.toString());

      setPhase('pricing');
      const price = await fetchSolPrice();
      setSolPrice(price);
      setSolAmount((pkg.price / price) * PRICE_BUFFER);
      setPhase('ready');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('cancelled')) {
        setPhase('idle');
      } else {
        setError('Failed to connect wallet. Try again.');
      }
    }
  }

  async function handlePay() {
    const phantom = getPhantom();
    if (!phantom || !walletAddress || !solAmount || !pkg) return;

    try {
      setPhase('sending');
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(walletAddress) });
      tx.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(walletAddress),
          toPubkey: new PublicKey(DESTINATION_WALLET),
          lamports: Math.ceil(solAmount * LAMPORTS_PER_SOL),
        })
      );

      const { signature } = await phantom.signAndSendTransaction(tx);

      setPhase('confirming');
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

      const res = await fetch('/api/payments/solana/confirm-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, walletAddress, packageId }),
      });

      const json = await res.json();
      if (!res.ok) return setError(json.error ?? 'Failed to add credits.');

      setPhase('done');
      await refresh();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('cancelled')) {
        setPhase('ready');
      } else if (msg.toLowerCase().includes('insufficient')) {
        setError('Insufficient SOL balance. Please top up your wallet and try again.');
      } else {
        setError('Transaction failed. Check your balance and network, then try again.');
      }
    }
  }

  if (!pkg) return null;

  if (!phantomInstalled) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <p className="font-mono text-xs text-muted">Phantom wallet is not installed in your browser.</p>
          <a
            href="https://phantom.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-periwinkle text-bg font-display font-600 text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Install Phantom
          </a>
          <p className="font-mono text-[10px] text-muted/50">After installing, refresh this page.</p>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="w-12 h-12 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-display font-600 text-bright text-sm">Credits added!</p>
        <p className="font-mono text-xs text-muted">{pkg.credits} credits have been added to your account.</p>
      </div>
    );
  }

  if (phase === 'idle') {
    return (
      <div className="space-y-3">
        <p className="font-mono text-xs text-muted text-center">
          Pay <span className="text-bright">${pkg.price}</span> in SOL for{' '}
          <span className="text-mint">{pkg.credits} credits</span>
        </p>
        <button
          type="button"
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-2 bg-periwinkle text-bg font-display font-600 text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition-all"
        >
          Connect Phantom Wallet
        </button>
        <p className="font-mono text-[10px] text-muted/50 text-center">Requires Phantom browser extension</p>
      </div>
    );
  }

  if (phase === 'connecting' || phase === 'pricing') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-6 h-6 rounded-full border-2 border-periwinkle border-t-transparent animate-spin" />
        <p className="font-mono text-xs text-muted">
          {phase === 'connecting' ? 'Connecting to Phantom…' : 'Fetching SOL price…'}
        </p>
      </div>
    );
  }

  if (phase === 'ready' && walletAddress && solAmount && solPrice) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-2.5">
          <span className="font-mono text-xs text-muted">Wallet</span>
          <span className="font-mono text-xs text-text">
            {walletAddress.slice(0, 4)}…{walletAddress.slice(-4)}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-center">
          <p className="font-display font-600 text-bright text-base">
            ${pkg.price}{' '}
            <span className="text-muted font-mono font-400 text-xs">≈</span>{' '}
            <span className="text-periwinkle">{solAmount.toFixed(4)} SOL</span>
          </p>
          <p className="font-mono text-[10px] text-muted/60">
            1 SOL = ${solPrice.toFixed(2)} · includes 1.5% price buffer · {pkg.credits} credits
          </p>
        </div>

        <button
          type="button"
          onClick={handlePay}
          className="w-full flex items-center justify-center gap-2 bg-periwinkle text-bg font-display font-600 text-sm px-4 py-2.5 rounded-xl hover:opacity-90 transition-all"
        >
          Pay with Phantom
        </button>

        <button type="button" onClick={reset} className="w-full text-center font-mono text-xs text-muted hover:text-text transition-colors">
          Disconnect
        </button>
      </div>
    );
  }

  if (phase === 'sending' || phase === 'confirming') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-6 h-6 rounded-full border-2 border-periwinkle border-t-transparent animate-spin" />
        <p className="font-mono text-xs text-muted">
          {phase === 'sending' ? 'Waiting for Phantom approval…' : 'Confirming on-chain…'}
        </p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="space-y-3 text-center">
        <p className="font-mono text-xs text-coral">{errorMsg}</p>
        <button type="button" onClick={reset} className="font-mono text-xs text-muted hover:text-text transition-colors underline">
          Try again
        </button>
      </div>
    );
  }

  return null;
}
