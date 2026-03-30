'use client';

import { useEffect, useRef, useState } from 'react';
import { useCredits } from '@/components/providers/CreditsProvider';
import { CREDIT_PACKAGES } from '@/lib/credits';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paypal?: any;
  }
}

interface PayPalCheckoutProps {
  packageId: string;
  onSuccess: () => void;
}

export default function PayPalCheckout({ packageId, onSuccess }: PayPalCheckoutProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { refresh } = useCredits();
  const renderedRef = useRef(false);

  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  useEffect(() => {
    if (!pkg || !clientId || renderedRef.current) return;

    const scriptId = 'paypal-sdk';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderButtons = () => {
      if (!containerRef.current || renderedRef.current) return;
      renderedRef.current = true;
      containerRef.current.innerHTML = '';

      window.paypal
        .Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
          createOrder: async () => {
            setStatus('processing');
            const res = await fetch('/api/payments/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ packageId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.orderId;
          },
          onApprove: async (data: { orderID: string }) => {
            const res = await fetch('/api/payments/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID, packageId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            await refresh();
            onSuccess();
          },
          onError: (err: Error) => {
            console.error('PayPal error:', err);
            setErrorMsg('Payment failed. Please try again.');
            setStatus('error');
          },
          onCancel: () => {
            setStatus('ready');
          },
        })
        .render(containerRef.current);

      setStatus('ready');
    };

    if (script) {
      if (window.paypal) renderButtons();
      else script.addEventListener('load', renderButtons);
    } else {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.addEventListener('load', renderButtons);
      script.addEventListener('error', () => {
        setErrorMsg('Failed to load PayPal. Check your connection.');
        setStatus('error');
      });
      document.head.appendChild(script);
    }
  }, [packageId, clientId, pkg, refresh, onSuccess]);

  if (!pkg) return null;

  return (
    <div className="space-y-3">
      <p className="font-mono text-xs text-muted text-center">
        Paying <span className="text-bright">${pkg.price}</span> for{' '}
        <span className="text-mint">{pkg.credits} credits</span>
      </p>

      {status === 'loading' && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 rounded-full border-2 border-mint border-t-transparent animate-spin" />
        </div>
      )}

      {status === 'error' && (
        <p className="text-coral text-xs font-mono text-center">{errorMsg}</p>
      )}

      <div ref={containerRef} className={status === 'loading' ? 'hidden' : ''} />
    </div>
  );
}
