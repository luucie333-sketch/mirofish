'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Bot, RotateCcw, Zap, Clock, ArrowRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Demo data ─────────────────────────────────────────────────────────────── */

const DEMO_REPORT = {
  title: 'What Would Happen If the US Bans TikTok Permanently?',
  stats: { agents: 12, rounds: 72, actions: 219, duration: '15 min' },
  summary:
    'A permanent TikTok ban would trigger major shifts in social media dynamics, advertising markets, and US-China geopolitical relations, with cascading effects on content creators and small businesses.',
  sections: [
    {
      title: 'Economic Impact & Market Shifts',
      content:
        'American tech giants like Meta and Google would see a surge in advertising revenue as users migrate from TikTok. ByteDance would face substantial losses in market access, potentially leading to layoffs. Smaller content creators and businesses that rely on TikTok for marketing would be adversely affected.',
      keyInsight:
        'Meta and Google could capture $12B+ in redirected advertising spend within the first year.',
      agentQuote:
        'The competitive rivalry between Meta and Google will intensify, especially concerning advertising revenue from migrating users.',
    },
    {
      title: 'Geopolitical Tensions',
      content:
        'The ban would exacerbate US-China tensions, with data security and privacy at the forefront. Other nations may feel pressured to align with US stances on technology governance, creating a ripple effect on international trade policies.',
      keyInsight:
        '60% of simulated policy agents predicted retaliatory measures from China within 90 days.',
      agentQuote:
        'Policymakers, businesses, and workers seek to navigate the evolving landscape in a post-TikTok economy.',
    },
    {
      title: 'Content Creator Displacement',
      content:
        'Millions of creators who built their brands on TikTok face immediate income loss. Many would migrate to Instagram Reels and YouTube Shorts, but the transition period could last 6–12 months with significant revenue gaps.',
      keyInsight:
        'An estimated 2M+ US creators would lose their primary income source in the first quarter.',
      agentQuote:
        "I'm trying to rebuild my audience on YouTube, but it's hard to replicate the same reach and engagement.",
    },
    {
      title: 'Emerging Platform Opportunities',
      content:
        'New social media platforms could emerge to fill the vacuum. Existing alternatives like Lemon8 and RedNote may see explosive growth, particularly among younger demographics seeking short-form video content.',
      keyInsight:
        'Simulated market agents predicted 3–5 new platforms gaining 10M+ users within 6 months of the ban.',
      agentQuote:
        'Emerging platforms have a unique opportunity to capture the audience TikTok leaves behind.',
    },
  ],
};

/* ─── Stats pill ────────────────────────────────────────────────────────────── */
function StatPill({
  icon, label, color,
}: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-xs', color)}>
      {icon}
      {label}
    </div>
  );
}

/* ─── Single accordion section ──────────────────────────────────────────────── */
function DemoSection({
  section, open, onToggle,
}: {
  section: typeof DEMO_REPORT.sections[number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      open ? 'border-mint/20 bg-mint/3' : 'border-border bg-card/60 hover:border-border/80'
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-mint/50 shrink-0" />
          <span className="font-display font-600 text-sm text-bright">{section.title}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted shrink-0 transition-transform duration-300',
            open && 'rotate-180 text-mint'
          )}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Body */}
          <p className="text-sm text-text leading-relaxed">{section.content}</p>

          {/* Key insight */}
          <div className="flex gap-3 p-3.5 rounded-xl border border-amber/20 bg-amber/5">
            <Lightbulb className="w-4 h-4 text-amber shrink-0 mt-0.5" />
            <div>
              <span className="font-mono text-[10px] text-amber/80 uppercase tracking-widest block mb-1">
                Key Insight
              </span>
              <p className="text-sm text-amber/90 leading-relaxed font-medium">{section.keyInsight}</p>
            </div>
          </div>

          {/* Agent quote */}
          <blockquote className="border-l-2 border-mint/40 pl-4 py-1">
            <p className="text-sm text-muted italic leading-relaxed">
              &ldquo;{section.agentQuote}&rdquo;
            </p>
            <footer className="mt-1.5 font-mono text-[10px] text-muted/50">— AI Agent</footer>
          </blockquote>
        </div>
      )}
    </div>
  );
}

/* ─── Main DemoReport component ─────────────────────────────────────────────── */
export default function DemoReport() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? -1 : i);

  return (
    <div className="rounded-2xl border border-mint/20 bg-card overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.1)] relative">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-mint/60 to-transparent" aria-hidden />

      {/* Card header */}
      <div className="px-6 pt-6 pb-5 border-b border-border/60">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-mint/20 bg-mint/5">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" aria-hidden />
            <span className="font-mono text-[10px] text-mint uppercase tracking-widest">
              Live Demo · Generated by MiroFish
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted/50 hidden sm:block">Powered by AI</span>
        </div>

        <h3 className="font-display font-800 text-bright text-lg sm:text-xl leading-snug mb-5">
          &ldquo;{DEMO_REPORT.title}&rdquo;
        </h3>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-2">
          <StatPill
            icon={<Bot className="w-3.5 h-3.5" />}
            label={`${DEMO_REPORT.stats.agents} Agents`}
            color="text-periwinkle border-periwinkle/20 bg-periwinkle/8"
          />
          <StatPill
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            label={`${DEMO_REPORT.stats.rounds} Rounds`}
            color="text-mint border-mint/20 bg-mint/8"
          />
          <StatPill
            icon={<Zap className="w-3.5 h-3.5" />}
            label={`${DEMO_REPORT.stats.actions} Actions`}
            color="text-amber border-amber/20 bg-amber/8"
          />
          <StatPill
            icon={<Clock className="w-3.5 h-3.5" />}
            label={DEMO_REPORT.stats.duration}
            color="text-coral border-coral/20 bg-coral/8"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-5 border-b border-border/40">
        <p className="font-mono text-[10px] text-muted/60 uppercase tracking-widest mb-2">Summary</p>
        <p className="text-sm text-muted leading-relaxed">{DEMO_REPORT.summary}</p>
      </div>

      {/* Accordion sections */}
      <div className="px-6 py-5 space-y-3">
        {DEMO_REPORT.sections.map((section, i) => (
          <DemoSection
            key={section.title}
            section={section}
            open={openIndex === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-6 pt-2 flex flex-col items-center text-center gap-3">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent mb-2" aria-hidden />
        <p className="font-mono text-xs text-muted">
          This is a real prediction generated by MiroFish. Yours takes 10–20 minutes.
        </p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2.5 font-display font-700 text-base px-8 py-4 rounded-xl bg-mint text-bg hover:bg-mint-dim shadow-glow-mint transition-all duration-200 group"
        >
          Get Your Own Prediction — Free
          <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <p className="font-mono text-xs text-muted/50">No credit card required · 1 free prediction</p>
      </div>
    </div>
  );
}
