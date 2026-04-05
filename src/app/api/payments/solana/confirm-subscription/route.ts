import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { SUBSCRIPTION_PLAN } from '@/lib/credits';
import { NextResponse } from 'next/server';

const DESTINATION_WALLET = '6rtUtvia4cGAxFn6WTuH8d56HgrA6m9DYLQy2ExKXuM5';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
// Accept if received value is within 3% below expected (covers price movement + buffer)
const TOLERANCE = 0.97;

async function getSolPrice(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error('Failed to fetch SOL price');
  const data = await res.json();
  return data.solana.usd as number;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { signature, walletAddress } = await request.json();

  if (!signature?.trim() || !walletAddress?.trim()) {
    return NextResponse.json({ error: 'Missing signature or wallet address' }, { status: 400 });
  }

  // Prevent replay: check if this signature was already used
  const service = createServiceClient();
  const { data: existing } = await service
    .from('transactions')
    .select('id')
    .eq('solana_signature', signature)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Transaction already used' }, { status: 400 });
  }

  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    const txResponse = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!txResponse) {
      return NextResponse.json({ error: 'Transaction not found on-chain' }, { status: 400 });
    }

    if (txResponse.meta?.err) {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
    }

    // Resolve account keys (works for both legacy and v0 transactions)
    const message = txResponse.transaction.message;
    const accountKeys: string[] =
      'getAccountKeys' in message
        ? message.getAccountKeys().staticAccountKeys.map((k: PublicKey) => k.toBase58())
        : (message as { accountKeys: PublicKey[] }).accountKeys.map((k: PublicKey) => k.toBase58());

    const ourIndex = accountKeys.indexOf(DESTINATION_WALLET);
    if (ourIndex === -1) {
      return NextResponse.json({ error: 'Destination wallet not found in transaction' }, { status: 400 });
    }

    const preBalances = txResponse.meta!.preBalances;
    const postBalances = txResponse.meta!.postBalances;
    const receivedLamports = postBalances[ourIndex] - preBalances[ourIndex];
    const receivedSol = receivedLamports / LAMPORTS_PER_SOL;

    // Verify amount: fetch current price and check received SOL covers the subscription price
    const solPrice = await getSolPrice();
    const expectedSol = (SUBSCRIPTION_PLAN.price / solPrice) * TOLERANCE;

    if (receivedSol < expectedSol) {
      return NextResponse.json(
        { error: `Insufficient payment. Received ${receivedSol.toFixed(4)} SOL, expected ~${expectedSol.toFixed(4)} SOL.` },
        { status: 400 }
      );
    }

    // Activate subscription
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await service
      .from('users')
      .update({
        subscription_tier: 'unlimited',
        subscription_started_at: now.toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', user.id);

    await service.from('transactions').insert({
      user_id: user.id,
      type: 'subscription_purchase',
      amount: 0,
      description: `SOL (Phantom) — Unlimited Monthly Subscription (30 days) · ${receivedSol.toFixed(4)} SOL`,
      solana_signature: signature,
      wallet_address: walletAddress,
    });

    return NextResponse.json({
      subscription: 'unlimited',
      subscriptionExpires: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Solana confirm-subscription error:', err);
    return NextResponse.json({ error: 'Failed to verify transaction' }, { status: 500 });
  }
}
