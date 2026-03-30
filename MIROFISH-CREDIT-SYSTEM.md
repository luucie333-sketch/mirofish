# MiroFish.us — Credit System & Monetization Spec

## Overview

Add a credit-based monetization system to the existing mirofish.us Next.js app at `C:\Users\asus\Downloads\mirofish`. Users sign in via **email magic link** (powered by Supabase Auth — no OAuth setup needed), purchase credits via PayPal or manual crypto transfer, and spend credits to use the AI chat.

---

## Architecture Overview

```
User lands on mirofish.us
  → Browses landing page freely (no auth required)
  → Clicks "Start Chat"
  → Prompted to sign in (enter email → magic link sent → click link → signed in)
  → Signed in → sees credit balance in header
  → If credits > 0 → chat works, deducts 1 credit per message
  → If credits = 0 → shown "Buy Credits" modal with PayPal + crypto options
  → Buys credits → balance updates → continues chatting
```

---

## Tech Stack Additions

- **Auth**: Supabase Auth (email magic links — zero OAuth config needed)
- **Database**: Supabase PostgreSQL (free tier)
- **PayPal**: PayPal JavaScript SDK (client-side buttons) + PayPal REST API (server-side verification)
- **Crypto**: Manual wallet display + admin panel for manual credit top-up
- **API Routes**: Next.js Route Handlers (`src/app/api/...`)

---

## Supabase Setup (do this first)

1. Go to https://supabase.com and create a free account
2. Create a new project (pick any region, set a database password)
3. Once created, go to **Project Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **Authentication → URL Configuration** and set:
   - Site URL: `https://mirofish.us`
   - Redirect URLs: add `https://mirofish.us/auth/callback`
5. Go to **Authentication → Email Templates** — customize if you want, defaults work fine
6. Go to **SQL Editor** and run the schema below

---

## Database Schema

Run this in Supabase SQL Editor:

```sql
-- Users table (created on first sign-in via trigger)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user row when someone signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, credits, role)
  VALUES (NEW.id, NEW.email, 3, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Credit transactions log
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  paypal_order_id TEXT,
  crypto_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crypto payment requests (pending manual verification)
CREATE TABLE public.crypto_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  credits_requested INTEGER NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.crypto_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own crypto requests" ON public.crypto_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own crypto requests" ON public.crypto_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (allow admin to read/write everything)
CREATE POLICY "Admin full access users" ON public.users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admin full access transactions" ON public.transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admin full access crypto_requests" ON public.crypto_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

After your first sign-in, make yourself admin:
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

## Authentication — Supabase Magic Links

### How It Works

1. User enters their email on the sign-in page
2. Supabase sends them a magic link email
3. User clicks the link → redirected back to the app, fully authenticated
4. On first sign-in, the database trigger auto-creates their user row with 3 free credits
5. Session persisted via Supabase client — stays logged in across page refreshes

### Auth File Structure

```
src/lib/supabase/
├── client.ts        # Browser Supabase client (uses anon key)
├── server.ts        # Server-side Supabase client (uses service role key)

src/app/auth/
├── signin/page.tsx   # Email input + "Send Magic Link" button
├── callback/route.ts # Handles the magic link redirect, exchanges code for session
└── signout/route.ts  # Sign out handler

src/middleware.ts      # Refresh Supabase auth session on each request
```

### Sign-In Page UI

- Clean page matching the existing site design
- Email input field with placeholder "Enter your email"
- "Send Magic Link" button
- Success state: "Check your email! Click the link to sign in." with animated email icon
- Error state: "Something went wrong. Try again."
- No passwords, no OAuth buttons — just email

---

## Credit System

### Pricing

```ts
export const CREDIT_PACKAGES = [
  { id: "starter", credits: 10, price: 2.99, label: "Starter" },
  { id: "pro", credits: 50, price: 9.99, label: "Pro", popular: true },
  { id: "power", credits: 150, price: 19.99, label: "Power User" },
] as const;
```

### Rules

- **1 credit per chat message** sent to the AI
- **3 free credits on signup**
- Credits never expire

### API Routes

```
src/app/api/
├── credits/
│   ├── balance/route.ts            # GET — current user's credit balance
│   └── use/route.ts                # POST — deduct 1 credit, return new balance
├── payments/
│   ├── paypal/
│   │   ├── create-order/route.ts   # POST — create PayPal order
│   │   └── capture-order/route.ts  # POST — capture payment, add credits
│   └── crypto/
│       └── request/route.ts        # POST — submit crypto payment request
└── admin/
    ├── users/route.ts              # GET — list users (admin only)
    ├── crypto-requests/route.ts    # GET/PATCH — manage crypto requests (admin only)
    └── topup/route.ts              # POST — manually add credits (admin only)
```

### Credit Gate in Chat

```ts
const sendMessage = async (content: string) => {
  const res = await fetch("/api/credits/use", { method: "POST" });
  if (res.status === 402) {
    setShowBuyModal(true);  // No credits
    return;
  }
  if (res.status === 401) {
    router.push("/auth/signin");  // Not signed in
    return;
  }
  // Credit deducted — send message to AI backend
};
```

---

## PayPal Integration

### Setup

1. Go to https://developer.paypal.com
2. Create a Business app (sandbox first, switch to live later)
3. Copy Client ID and Secret into .env.local

### Flow

1. User selects credit package → clicks "Buy with PayPal"
2. `POST /api/payments/paypal/create-order` → creates order, returns order ID
3. PayPal JS SDK renders buttons → user completes payment
4. `POST /api/payments/paypal/capture-order` → captures payment, verifies amount server-side, adds credits, logs transaction
5. Frontend refreshes credit balance

### CRITICAL: Server-Side Verification

Never trust client-side payment confirmation. Always:
1. Capture the order via PayPal REST API on the server
2. Verify the captured amount matches the expected package price
3. Only then add credits and log the transaction

---

## Manual Crypto Payment

### Flow

1. User selects credit package → clicks "Pay with Crypto"
2. Modal shows wallet addresses with copy buttons and QR codes
3. User sends crypto from their wallet externally
4. User pastes their transaction hash into the form and submits
5. `POST /api/payments/crypto/request` saves request as "pending"
6. Admin verifies on blockchain explorer, clicks "Confirm" in admin panel
7. Credits added to user account

### Wallet Display

Show these wallet addresses (from environment variables):
- **BTC**: `NEXT_PUBLIC_BTC_WALLET`
- **ETH**: `NEXT_PUBLIC_ETH_WALLET`
- **USDT (TRC-20)**: `NEXT_PUBLIC_USDT_TRC20_WALLET`

Each with a copy-to-clipboard button and QR code (use `qrcode.react` package).

Include a note: "Manual verification usually takes 1-24 hours."

---

## Admin Panel (`/admin`)

Protected page — redirect to home if user role is not 'admin'.

### Sections

1. **Dashboard**: Total users, total credits sold, pending crypto requests count
2. **Users Table**: Email, credits, role, created date, "Top Up" input + button per row
3. **Crypto Requests**: Pending requests showing user email, wallet type, tx hash (linked to blockchain explorer), amount, credits requested, "Confirm" / "Reject" buttons
4. **Transaction Log**: Recent transactions across all users

### Blockchain Explorer Links

- BTC: `https://blockchair.com/bitcoin/transaction/{hash}`
- ETH: `https://etherscan.io/tx/{hash}`
- USDT TRC-20: `https://tronscan.org/#/transaction/{hash}`

---

## UI Components to Build

### Header Updates

- **Logged out**: "Sign In" button in header nav
- **Logged in**: User email + credit balance badge (⚡ 47) + dropdown with "Buy Credits" and "Sign Out"

### Buy Credits Modal

- Triggered when: user clicks credit badge, or has 0 credits and tries to send a message
- 3 package cards (Starter / Pro / Power User) — Pro highlighted as "Popular"
- Two payment tabs: "PayPal" | "Crypto"
- PayPal tab: renders PayPal SDK buttons
- Crypto tab: wallet addresses with QR codes + tx hash input form
- "You have X credits" shown at top

### Zero Credits State

- Chat input shows subtle lock icon
- Toast notification: "You're out of credits. Top up to continue."
- Buy Credits modal auto-opens

---

## Environment Variables

Create `.env.local` in `C:\Users\asus\Downloads\mirofish`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox

# Crypto wallets
NEXT_PUBLIC_BTC_WALLET=your-btc-address
NEXT_PUBLIC_ETH_WALLET=your-eth-address
NEXT_PUBLIC_USDT_TRC20_WALLET=your-trc20-address

# Backend
NEXT_PUBLIC_API_URL=http://your-backend:5001
NEXT_PUBLIC_SITE_URL=https://mirofish.us
```

---

## Deployment Change

**IMPORTANT**: Remove `output: 'export'` from `next.config.mjs`. API routes and auth need a Node.js server.

**Recommended: Vercel (free tier)**
1. Push to GitHub
2. Connect to Vercel
3. Add env vars in Vercel dashboard
4. Point mirofish.us DNS to Vercel

**Alternative: Namecheap Node.js via cPanel**
1. cPanel → Setup Node.js App → Node 18+
2. `npm install && npm run build && npm start`

---

## Packages to Install

```bash
npm install @supabase/supabase-js @supabase/ssr qrcode.react
```

---

## Full File Structure (additions only)

```
src/
├── app/
│   ├── api/
│   │   ├── credits/
│   │   │   ├── balance/route.ts
│   │   │   └── use/route.ts
│   │   ├── payments/
│   │   │   ├── paypal/
│   │   │   │   ├── create-order/route.ts
│   │   │   │   └── capture-order/route.ts
│   │   │   └── crypto/
│   │   │       └── request/route.ts
│   │   └── admin/
│   │       ├── users/route.ts
│   │       ├── crypto-requests/route.ts
│   │       └── topup/route.ts
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   ├── callback/route.ts
│   │   └── signout/route.ts
│   ├── admin/page.tsx
│   ├── layout.tsx                    # Wrap with Supabase auth provider
│   └── chat/page.tsx                 # Add credit gate logic
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   ├── UserMenu.tsx
│   │   └── AuthGuard.tsx
│   ├── credits/
│   │   ├── BuyCreditsModal.tsx
│   │   ├── CreditBadge.tsx
│   │   ├── PackageCard.tsx
│   │   ├── PayPalCheckout.tsx
│   │   └── CryptoPayment.tsx
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── UserTable.tsx
│       ├── CryptoRequestsTable.tsx
│       └── TopUpForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── paypal.ts
│   └── credits.ts
└── middleware.ts
```

---

## Claude Code Prompt

> Read `MIROFISH-CREDIT-SYSTEM.md` in the project root at `C:\Users\asus\Downloads\mirofish`. This is the complete spec for adding a credit system to the existing mirofish.us Next.js app. Build everything: Supabase Auth with email magic links (no OAuth — users just enter email and get a login link), Supabase PostgreSQL for user data and transactions, credit system (3 free on signup, 1 per message), PayPal checkout with server-side verification, manual crypto payment flow with wallet addresses and QR codes and tx hash submission, admin panel at /admin for managing users and confirming crypto payments, Buy Credits modal with PayPal and Crypto tabs, credit gate in chat that checks credits before sending messages, sign-in page with magic link flow, and middleware for session refresh. Remove static export from next.config.mjs since we need API routes. Install @supabase/supabase-js @supabase/ssr qrcode.react. Match the existing site design for all new components. Build it all in one go, no questions.
