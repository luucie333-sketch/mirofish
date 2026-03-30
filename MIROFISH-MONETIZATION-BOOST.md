# MiroFish.us — Monetization Boost Spec

## Overview

Three changes to increase revenue:
1. Reduce free signup credits from 3 to 1
2. Add a $29.99/month subscription plan (unlimited messages)
3. Block multiple signups from the same IP address

Project location: `C:\Users\asus\Downloads\mirofish`

---

## Change 1: Reduce Free Credits to 1

### Database

Run this in Supabase SQL Editor to update the trigger for NEW signups:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, credits, role)
  VALUES (NEW.id, NEW.email, 1, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Existing users keep their current credits — this only affects new signups.

### Frontend

In `src/lib/credits.ts`, if there's a reference to "3 free credits" in comments or UI text, change it to "1 free credit".

In any landing page or sign-in page text that mentions "3 free credits", update to "1 free credit to try".

---

## Change 2: Subscription Plan

### Database Changes

Add subscription fields to the users table. Run in Supabase SQL Editor:

```sql
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_paypal_id TEXT DEFAULT NULL;
```

### Pricing Update

Update `src/lib/credits.ts` to add the subscription plan alongside existing credit packages:

```typescript
export const CREDIT_PACKAGES = [
  { id: 'starter', credits: 10, price: 2.99, label: 'Starter' },
  { id: 'pro', credits: 50, price: 9.99, label: 'Pro', popular: false },
  { id: 'power', credits: 150, price: 19.99, label: 'Power User' },
] as const;

export const SUBSCRIPTION_PLAN = {
  id: 'unlimited',
  price: 29.99,
  label: 'Unlimited Monthly',
  description: 'Unlimited predictions for 30 days',
  popular: true,
} as const;
```

### Buy Credits Modal Update

Update `src/components/credits/BuyCreditsModal.tsx`:

- Add a third tab: "Credits" | "Crypto" | "Subscription"
- OR better: show the subscription plan as a highlighted card ABOVE the credit packages
- Subscription card should say:
  - "Unlimited Monthly — $29.99/mo"
  - "Unlimited predictions for 30 days"
  - "Best value" badge
  - PayPal subscribe button

### PayPal Subscription Integration

Create a new API route: `src/app/api/payments/paypal/create-subscription/route.ts`

PayPal subscriptions work differently from one-time orders:

1. You need to create a **PayPal Plan** first (one-time setup in PayPal dashboard or via API)
2. Then create a **Subscription** for the user

**Simpler approach**: Use PayPal one-time payment for 30 days of unlimited access. When a user pays $29.99:
- Set `subscription_tier = 'unlimited'`
- Set `subscription_started_at = NOW()`
- Set `subscription_expires_at = NOW() + 30 days`
- Log the transaction

This avoids PayPal recurring billing complexity. User pays $29.99 each time they want another month.

### New API Route: `src/app/api/payments/paypal/create-subscription/route.ts`

```typescript
// POST — create a PayPal order for the subscription ($29.99)
// Same as create-order but for the subscription price
// On capture: update user's subscription fields instead of adding credits
```

### New API Route: `src/app/api/payments/paypal/capture-subscription/route.ts`

```typescript
// POST — capture subscription payment
// 1. Capture PayPal order
// 2. Verify amount = $29.99
// 3. Update user:
//    subscription_tier = 'unlimited'
//    subscription_started_at = NOW()
//    subscription_expires_at = NOW() + 30 days
//    subscription_paypal_id = order_id
// 4. Log transaction with type = 'subscription_purchase'
```

### Credit Check Update

Update `src/app/api/credits/use/route.ts`:

Before deducting a credit, check if the user has an active subscription:

```typescript
// 1. Get user from DB
const user = await getUser(userId);

// 2. Check subscription first
if (user.subscription_tier === 'unlimited' && 
    user.subscription_expires_at && 
    new Date(user.subscription_expires_at) > new Date()) {
  // Active subscription — allow message, don't deduct credits
  return NextResponse.json({ credits: user.credits, subscription: true });
}

// 3. No active subscription — deduct credit as before
if (user.credits <= 0) {
  return NextResponse.json({ error: 'No credits' }, { status: 402 });
}
// ... deduct credit
```

### Balance API Update

Update `src/app/api/credits/balance/route.ts` to also return subscription info:

```typescript
return NextResponse.json({ 
  credits: data.credits, 
  role: data.role,
  subscription: data.subscription_tier,
  subscriptionExpires: data.subscription_expires_at,
});
```

### UI Updates

- Credit badge in header: if subscribed, show "∞ Unlimited" instead of credit count
- Credit banner in chat: if subscribed, show "Unlimited plan active — expires [date]"
- Buy Credits modal: show subscription as the top/featured option
- If subscription is active, hide the credit packages or show them greyed out with "You have unlimited access"

### Crypto Subscription

For crypto: user can also pay $29.99 in crypto for a monthly subscription. In the crypto payment request form, add an option:

```
What are you purchasing?
○ Credit Package (Starter/Pro/Power)
○ Monthly Subscription ($29.99)
```

When admin confirms a crypto subscription request, they set the subscription fields manually via the admin panel top-up section (or add a "Grant Subscription" button).

### Admin Panel Update

Add subscription info to the users table in the admin panel:
- Show subscription status (active/expired/none)
- Add a "Grant Subscription" button per user (for manual crypto confirmations)

---

## Change 3: IP-Based Signup Restriction

### How It Works

Track the IP address when a user signs up. If another signup attempt comes from the same IP within 24 hours, block it.

### Database

Add an IP tracking table. Run in Supabase SQL Editor:

```sql
CREATE TABLE public.signup_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast IP lookups
CREATE INDEX idx_signup_ips_ip ON public.signup_ips(ip_address);
CREATE INDEX idx_signup_ips_created ON public.signup_ips(created_at);

-- RLS: only service role can access this table
ALTER TABLE public.signup_ips ENABLE ROW LEVEL SECURITY;
-- No user policies — only accessible via service role key (server-side)
```

### New API Route: `src/app/api/auth/check-ip/route.ts`

```typescript
// POST — check if this IP has already signed up recently
// Request: { ip: string }
// 
// Logic:
// 1. Get the user's IP from request headers (x-forwarded-for on Vercel)
// 2. Check signup_ips table for this IP in the last 24 hours
// 3. If found: return { blocked: true, message: "An account was already created from this network. Please sign in instead." }
// 4. If not found: return { blocked: false }
```

### Sign-In Page Update

Update `src/app/auth/signin/page.tsx`:

Before sending the magic link, call the IP check:

```typescript
const sendMagicLink = async () => {
  // 1. Check if this IP already signed up
  const ipCheck = await fetch('/api/auth/check-ip', { method: 'POST' });
  const { blocked, existing } = await ipCheck.json();
  
  if (blocked) {
    // Check if the email they're entering is the one that already signed up from this IP
    // If yes — let them through (they're signing in, not creating a new account)
    // If no — block with message
    setError("An account was already created from this network. Please sign in with your existing account or purchase credits.");
    return;
  }

  // 2. Send magic link as normal
  const { error } = await supabase.auth.signInWithOtp({ email });
  // ...
};
```

### Important: Allow Existing Users to Sign In

The IP block should ONLY prevent NEW account creation, not block existing users from signing in. Logic:

1. User enters email on sign-in page
2. Check if this email already exists in the users table
3. If YES → this is an existing user signing in → ALLOW (don't check IP)
4. If NO → this is a new signup → check IP → if IP was used in last 24 hours → BLOCK

### New API Route: `src/app/api/auth/check-ip/route.ts` (Full Logic)

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  
  // Get IP from Vercel headers
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Check if email already exists (existing user signing in)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    // Existing user — always allow sign in
    return NextResponse.json({ blocked: false, existing: true });
  }

  // 2. New signup — check if IP was used in last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: recentSignups } = await supabase
    .from('signup_ips')
    .select('id, email')
    .eq('ip_address', ip)
    .gte('created_at', twentyFourHoursAgo);

  if (recentSignups && recentSignups.length > 0) {
    return NextResponse.json({ 
      blocked: true, 
      message: 'An account was already created from this network. Please sign in with your existing email or purchase credits.' 
    });
  }

  // 3. Not blocked — allow signup
  return NextResponse.json({ blocked: false, existing: false });
}
```

### Record IP After Successful Signup

In the auth callback route (`src/app/auth/callback/route.ts`), after successfully exchanging the code:

```typescript
// After successful auth code exchange:
// 1. Get the user
// 2. Check if this is their first sign-in (new user)
// 3. If new user, record their IP in signup_ips table
```

Or better: use a Supabase database trigger. After a new row is inserted into `public.users`, record the signup. But since we don't have the IP in the trigger, the API route approach is better.

### Recording the IP

Add IP recording to the auth callback or create a middleware that runs after first sign-in:

In `src/app/auth/callback/route.ts`, after exchanging the code:

```typescript
// After successful code exchange
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  
  // Use service role client to insert (bypasses RLS)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Check if this user already has an IP record (returning user)
  const { data: existing } = await serviceClient
    .from('signup_ips')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  if (!existing) {
    // First-time callback — record IP
    await serviceClient.from('signup_ips').insert({
      ip_address: ip,
      user_id: user.id,
      email: user.email,
    });
  }
}
```

---

## Files to Modify

```
src/lib/credits.ts                              — Add SUBSCRIPTION_PLAN, update free credit references
src/app/api/credits/balance/route.ts            — Return subscription info
src/app/api/credits/use/route.ts                — Check subscription before deducting
src/app/api/payments/paypal/create-subscription/route.ts  — NEW: create PayPal order for subscription
src/app/api/payments/paypal/capture-subscription/route.ts — NEW: capture and activate subscription
src/app/api/auth/check-ip/route.ts              — NEW: IP check for new signups
src/app/auth/signin/page.tsx                    — Add IP check before sending magic link
src/app/auth/callback/route.ts                  — Record IP after first sign-in
src/components/credits/BuyCreditsModal.tsx       — Add subscription option as featured card
src/components/credits/CreditBadge.tsx           — Show "∞" for subscribers
src/components/auth/UserMenu.tsx                 — Show subscription status
src/app/chat/page.tsx                           — Update credit banner for subscribers
src/app/admin/page.tsx                          — Show subscription info, add "Grant Subscription" button
src/app/page.tsx                                — Update "1 free credit" text on landing page
```

---

## SQL to Run in Supabase (Before Building)

```sql
-- 1. Update signup trigger to give 1 free credit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, credits, role)
  VALUES (NEW.id, NEW.email, 1, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add subscription columns
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_paypal_id TEXT DEFAULT NULL;

-- 3. Create IP tracking table
CREATE TABLE public.signup_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signup_ips_ip ON public.signup_ips(ip_address);
CREATE INDEX idx_signup_ips_created ON public.signup_ips(created_at);

ALTER TABLE public.signup_ips ENABLE ROW LEVEL SECURITY;
```

---

## Claude Code Prompt

> Read `MIROFISH-MONETIZATION-BOOST.md` in the project root at `C:\Users\asus\Downloads\mirofish`. This spec has 3 changes: (1) Update all UI text referencing free credits from 3 to 1. (2) Add a $29.99/month unlimited subscription plan — featured card in Buy Credits modal above credit packages, new PayPal create-subscription and capture-subscription API routes, update credits/use route to check subscription before deducting, update credits/balance to return subscription info, show "∞ Unlimited" in header for subscribers, update chat credit banner for subscribers, add "Grant Subscription" button in admin panel. (3) IP-based signup restriction — new check-ip API route, update sign-in page to check IP before sending magic link (allow existing users to sign in, only block new signups from same IP within 24 hours), record IP in auth callback. Run the SQL from the spec in the "SQL to Run" section first. Build all changes in one go, no questions.
