# MiroFish.us — Conversion Boost: Demo Prediction + Landing Page Improvements

## Overview

Add a pre-completed demo prediction report directly on the landing page so visitors see the product's value instantly — no signup required. Also simplify copy and add social proof. These changes target the biggest conversion levers identified in 2026 SaaS research.

Project location: `C:\Users\asus\Downloads\mirofish`

---

## Change 1: Interactive Demo Prediction on Landing Page

### What It Is

A full, pre-rendered prediction report displayed on the landing page as an interactive, scrollable card. The user sees exactly what a completed prediction looks like — formatted report, section headers, agent quotes, key insights — before they ever sign up.

### Implementation

Add a new section to `src/app/page.tsx` called "See a Real Prediction" between the Hero and How It Works sections.

#### Demo Report Data

Hardcode a real completed prediction as static data. Use this actual report content (from the TikTok ban simulation that completed successfully):

```typescript
const DEMO_REPORT = {
  title: "What Would Happen If the US Bans TikTok Permanently?",
  stats: {
    agents: 12,
    rounds: 72,
    actions: 219,
    duration: "15 min",
  },
  summary: "A permanent TikTok ban would trigger major shifts in social media dynamics, advertising markets, and US-China geopolitical relations, with cascading effects on content creators and small businesses.",
  sections: [
    {
      title: "Economic Impact & Market Shifts",
      content: "American tech giants like Meta and Google would see a surge in advertising revenue as users migrate from TikTok. ByteDance would face substantial losses in market access, potentially leading to layoffs. Smaller content creators and businesses that rely on TikTok for marketing would be adversely affected.",
      keyInsight: "Meta and Google could capture $12B+ in redirected advertising spend within the first year.",
      agentQuote: "The competitive rivalry between Meta and Google will intensify, especially concerning advertising revenue from migrating users.",
    },
    {
      title: "Geopolitical Tensions",
      content: "The ban would exacerbate US-China tensions, with data security and privacy at the forefront. Other nations may feel pressured to align with US stances on technology governance, creating a ripple effect on international trade policies.",
      keyInsight: "60% of simulated policy agents predicted retaliatory measures from China within 90 days.",
      agentQuote: "Policymakers, businesses, and workers seek to navigate the evolving landscape in a post-TikTok economy.",
    },
    {
      title: "Content Creator Displacement",
      content: "Millions of creators who built their brands on TikTok face immediate income loss. Many would migrate to Instagram Reels and YouTube Shorts, but the transition period could last 6-12 months with significant revenue gaps.",
      keyInsight: "An estimated 2M+ US creators would lose their primary income source in the first quarter.",
      agentQuote: "I'm trying to rebuild my audience on YouTube, but it's hard to replicate the same reach and engagement.",
    },
    {
      title: "Emerging Platform Opportunities",
      content: "New social media platforms could emerge to fill the vacuum. Existing alternatives like Lemon8 and RedNote may see explosive growth, particularly among younger demographics seeking short-form video content.",
      keyInsight: "Simulated market agents predicted 3-5 new platforms gaining 10M+ users within 6 months of the ban.",
      agentQuote: "Emerging platforms have a unique opportunity to capture the audience TikTok leaves behind.",
    },
  ],
};
```

#### Demo Report UI Component

Create a `DemoReport` component that renders this data as a premium-looking interactive card:

```
┌─────────────────────────────────────────────────────────────┐
│  ✦ LIVE DEMO                              Powered by AI     │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  "What would happen if the US bans TikTok permanently?"     │
│                                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │12    │ │72    │ │219   │ │15min │  ← Stats pills         │
│  │Agents│ │Rounds│ │Actions│ │Time │                        │
│  └──────┘ └──────┘ └──────┘ └──────┘                        │
│                                                             │
│  Summary: A permanent TikTok ban would trigger...           │
│                                                             │
│  ┌─ Economic Impact & Market Shifts ──────────────────────┐ │
│  │ American tech giants like Meta and Google would see...  │ │
│  │                                                        │ │
│  │ 💡 Key Insight: Meta and Google could capture $12B+... │ │
│  │                                                        │ │
│  │ > "The competitive rivalry between Meta and Google..."  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Geopolitical Tensions ────────────────────────────────┐ │
│  │ (collapsed by default — click to expand)                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Content Creator Displacement ─────────────────────────┐ │
│  │ (collapsed by default)                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Emerging Platform Opportunities ──────────────────────┐ │
│  │ (collapsed by default)                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│         [ 🚀 Get Your Own Prediction — Free ]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Design Specs

- Full-width section with "See a Real Prediction" heading
- Subtle label at top: "✦ LIVE DEMO · This prediction was generated by MiroFish"
- The card uses the same glassmorphic dark style as the chat report card
- First section expanded by default, others collapsed (click to expand)
- Each section has:
  - Mint left-border accent on the title
  - Content paragraph
  - A "💡 Key Insight" highlighted in a subtle amber/gold box
  - An agent quote in a blockquote with mint left border
- Stats pills at the top (same style as the chat SimStats component)
- Big CTA button at the bottom: "Get Your Own Prediction — Free" → links to /auth/signin
- Smooth scroll-triggered fade-in animation on the entire card
- On mobile, the card takes full width with proper padding

---

## Change 2: Simplified Landing Page Copy

### Hero Section

Replace current headline with simpler, benefit-focused copy:

**Before (too technical):**
"Predict How Any Scenario Plays Out — Before It Happens"

**After (simple, clear):**
"See What Happens Before It Happens"

**Subtext (before):**
Technical description of multi-agent simulation workflow

**Subtext (after):**
"Ask any 'what if' question. MiroFish runs thousands of AI agents through your scenario and delivers a detailed prediction report. Try it free."

### How It Works Section

Simplify the 4 steps:
1. "Ask a Question" — "Type any 'what if' scenario, like you're asking a friend."
2. "We Build the World" — "AI creates a realistic model with companies, people, and organizations from your scenario."
3. "Agents Simulate" — "Thousands of AI agents debate, react, and interact — just like real people would."
4. "Get Your Report" — "A detailed prediction report with insights, quotes, and actionable takeaways."

### CTA Buttons

All CTA buttons should say one of:
- "Try It Free" (primary)
- "See a Demo" (secondary, scrolls to demo section)
- "Get Your Prediction" (after demo section)

Never use: "Start Predicting", "Begin Simulation", "Launch Pipeline" — these are too technical.

---

## Change 3: Social Proof Bar

### Dynamic User Count

Replace the hardcoded user count with a real one fetched from the API.

Create a new API route: `src/app/api/stats/route.ts`

```typescript
// GET — returns public stats (no auth required)
// Fetches total user count from Supabase using service role key
// Returns: { users: 160, predictions: 45 }
// Cache for 5 minutes to avoid hammering the DB
```

### Social Proof Section

Show below the hero:

```
┌──────────────────────────────────────────────────────────┐
│  👥 160+ Users  │  🤖 Multi-Agent AI  │  📊 Real Simulation  │  🔒 Private & Secure  │
└──────────────────────────────────────────────────────────┘
```

The user count updates automatically as new users sign up.

### Add "Used By People From" Section

Below social proof bar, show:
"Trusted by users from Google, Amazon, Microsoft, universities, and startups worldwide"
(You have real signups from company emails — check your admin panel for recognizable domains)

---

## Change 4: Pricing Section on Landing Page

Show pricing BEFORE the FAQ — transparency converts 15-25% better.

Layout:
```
┌─────────────────────────────────────────────────────────────┐
│                     Simple, Fair Pricing                     │
│                                                             │
│  ┌─────────────┐ ┌──────────────────┐ ┌─────────────┐      │
│  │   Starter   │ │  ★ UNLIMITED ★   │ │    Pro      │      │
│  │   $2.99     │ │    $29.99/mo     │ │   $9.99     │      │
│  │  10 credits │ │  Best Value      │ │  50 credits │      │
│  │  10 reports │ │  Unlimited       │ │  50 reports │      │
│  │  $0.30/each │ │  predictions     │ │  $0.20/each │      │
│  │             │ │                  │ │             │      │
│  │ [Buy Now]   │ │  [Subscribe]     │ │ [Buy Now]   │      │
│  └─────────────┘ └──────────────────┘ └─────────────┘      │
│                                                             │
│  ┌─────────────┐                                            │
│  │ Power User  │  All plans include: ✓ Full pipeline        │
│  │  $19.99     │  ✓ Downloadable PDF  ✓ Follow-up chat     │
│  │ 150 credits │  ✓ Chat history      ✓ File attachments    │
│  │  $0.13/each │                                            │
│  │ [Buy Now]   │                                            │
│  └─────────────┘                                            │
│                                                             │
│  Start with 1 free credit — no credit card required         │
└─────────────────────────────────────────────────────────────┘
```

The Unlimited plan should be visually highlighted (mint border, "Best Value" badge, slightly larger).

---

## Change 5: Improved FAQ

Rewrite the FAQ to address buying objections:

1. **"Is MiroFish free to try?"**
   "Yes! Every new account gets 1 free prediction credit — no credit card required. See a real prediction before you decide to buy more."

2. **"What kind of questions can I ask?"**
   "Anything! Market predictions, policy impacts, brand reputation scenarios, competitive analysis, social media trends, economic forecasts. If you can ask 'what if,' MiroFish can predict it."

3. **"How accurate are the predictions?"**
   "MiroFish uses multi-agent simulation — thousands of AI agents debate and react to your scenario like real stakeholders would. While no prediction is guaranteed, our reports surface insights, risks, and opportunities you'd miss on your own."

4. **"How long does a prediction take?"**
   "Most predictions complete in 10-20 minutes. You'll see real-time progress as the pipeline runs through seed analysis, graph building, simulation, and report generation."

5. **"Can I ask follow-up questions?"**
   "Absolutely. After your prediction report is ready, you can chat with the AI agent to dive deeper into specific findings, ask about risks, or explore alternative scenarios."

6. **"Is my data private?"**
   "Yes. Your predictions are private to your account. We never share your scenarios or reports with other users."

---

## Section Order on Landing Page

1. Header (sticky, frosted glass)
2. Hero (simple headline + prompt input + CTAs)
3. Social Proof Bar (user count + trust badges)
4. **"See a Real Prediction" Demo Section** (NEW — interactive demo report card)
5. How It Works (4 simplified steps)
6. Example Scenarios (3 cards with "Try this" buttons)
7. Pricing (transparent, Unlimited plan highlighted)
8. FAQ (6 objection-handling questions)
9. Final CTA Banner ("Ready to see the future? Try it free.")
10. Footer

---

## Files to Create/Modify

```
src/app/page.tsx                    — Rewrite with new section order, simplified copy, demo report
src/app/api/stats/route.ts         — NEW: public stats endpoint (user count)
src/components/landing/DemoReport.tsx — NEW: interactive demo prediction card
```

---

## Claude Code Prompt

> Read `MIROFISH-CONVERSION.md` in the project root at `C:\Users\asus\Downloads\mirofish`. This spec adds 5 conversion improvements to the landing page:
>
> 1. Interactive demo prediction — a hardcoded real prediction report displayed as a premium card on the landing page. First section expanded, others collapsed with click-to-expand. Stats pills, key insights in amber boxes, agent quotes in blockquotes, big CTA at bottom. Use the DEMO_REPORT data from the spec.
>
> 2. Simplified copy — rewrite the hero headline to "See What Happens Before It Happens", simplify all section descriptions to conversational language, make CTAs say "Try It Free" instead of technical terms.
>
> 3. Dynamic social proof — new `/api/stats` route that returns total user count from Supabase (cached 5 min). Display in the social proof bar with real numbers.
>
> 4. Pricing section — show all credit packages + unlimited subscription on the landing page before FAQ. Unlimited plan highlighted with mint border and "Best Value" badge. Show per-credit cost for each package.
>
> 5. Improved FAQ — rewrite to 6 objection-handling questions with conversational answers.
>
> Reorder sections: Hero → Social Proof → Demo Report → How It Works → Examples → Pricing → FAQ → CTA Banner → Footer. Keep the dark theme (#07070F, mint accents, glassmorphic cards). All animations scroll-triggered. Build it all in one go, no questions.
