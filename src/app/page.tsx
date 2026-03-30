'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Github, Paperclip, FileText, Zap,
  Brain, GitBranch, Bot, BarChart3,
  Shield, Check, Star, ChevronDown,
  Users, Sparkles, TrendingUp, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import UserMenu from '@/components/auth/UserMenu';
import { CREDIT_PACKAGES, SUBSCRIPTION_PLAN } from '@/lib/credits';

/* ─── Scroll-in animation hook ─────────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Shared button ─────────────────────────────────────────────────────────── */
function Button({
  children, variant = 'primary', size = 'md', className, ...props
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'xl';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-display font-600 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-mint text-bg hover:bg-mint-dim shadow-glow-mint focus-visible:ring-mint',
        variant === 'ghost' && 'bg-transparent text-muted hover:text-text hover:bg-white/5 focus-visible:ring-border',
        variant === 'outline' && 'bg-transparent border border-border text-text hover:border-mint/40 hover:text-mint focus-visible:ring-mint',
        variant === 'subtle' && 'bg-white/5 border border-white/8 text-text hover:bg-white/10 focus-visible:ring-border',
        size === 'sm' && 'text-xs px-3 py-1.5',
        size === 'md' && 'text-sm px-4 py-2.5',
        size === 'lg' && 'text-base px-6 py-3',
        size === 'xl' && 'text-lg px-8 py-4',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── Header ────────────────────────────────────────────────────────────────── */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn(
      'fixed top-0 inset-x-0 z-50 transition-all duration-300',
      scrolled ? 'bg-bg/90 backdrop-blur-xl border-b border-border shadow-[0_1px_0_rgba(30,30,53,0.8)]' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 select-none group">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden>
            <polygon points="2,2 2,18 22,10" fill="#64FFDA" opacity="0.9" className="group-hover:opacity-100 transition-opacity" />
            <polygon points="22,4 22,16 27,10" fill="#64FFDA" opacity="0.55" className="group-hover:opacity-80 transition-opacity" />
          </svg>
          <span className="font-display font-700 text-lg text-bright leading-none">MiroFish</span>
          <span className="font-mono text-xs text-mint/60 leading-none -ml-0.5">.us</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <a href="#how-it-works" className="text-sm px-4 py-2 rounded-lg text-muted hover:text-text transition-colors font-display font-500">How It Works</a>
          <a href="#examples" className="text-sm px-4 py-2 rounded-lg text-muted hover:text-text transition-colors font-display font-500">Examples</a>
          <a href="#pricing" className="text-sm px-4 py-2 rounded-lg text-muted hover:text-text transition-colors font-display font-500">Pricing</a>
          <a href="#faq" className="text-sm px-4 py-2 rounded-lg text-muted hover:text-text transition-colors font-display font-500">FAQ</a>
          <span className="w-px h-5 bg-border mx-1" />
          <a
            href="https://github.com/666ghj/MiroFish"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg text-muted hover:text-text hover:bg-white/5 transition-all duration-200 font-display font-500"
          >
            <Github className="w-4 h-4" />
          </a>
          <UserMenu />
        </nav>

        {/* Mobile: just UserMenu */}
        <div className="md:hidden">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────────────── */
function HeroSection({
  prompt, setPrompt, file, setFile, isDragging, onSubmit,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  isDragging: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-24 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-radial-mint pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-radial-coral pointer-events-none" aria-hidden />
      <div className="absolute inset-0 bg-grid bg-[length:48px_48px] opacity-30 pointer-events-none" aria-hidden />
      {/* Extra deep glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-mint/5 rounded-full blur-[120px] pointer-events-none" aria-hidden />

      {isDragging && (
        <div className="absolute inset-4 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-mint bg-mint/5 backdrop-blur-sm pointer-events-none" aria-hidden>
          <p className="font-display font-600 text-mint text-xl">Drop your file here</p>
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Announcement pill */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-mint/20 bg-mint/5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse-slow" aria-hidden />
            <span className="font-mono text-xs text-mint tracking-wide">Multi-Agent AI Simulation Engine · v0.1</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-display font-800 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-bright leading-[1.05] tracking-tight mb-6">
          Predict How Any Scenario
          <span className="block mt-1" style={{ color: '#64FFDA', textShadow: '0 0 40px rgba(100,255,218,0.3)' }}>
            Plays Out — Before It Happens
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-muted text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
          Type your scenario. MiroFish runs a full multi-agent simulation — analysing stakeholders,
          building knowledge graphs, and generating a confidence-scored prediction report you can actually
          interrogate in chat.
        </p>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center gap-2.5 font-display font-700 text-base px-8 py-4 rounded-xl bg-mint text-bg hover:bg-mint-dim shadow-glow-mint transition-all duration-200 group"
          >
            Start Your First Prediction
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 font-display font-600 text-sm px-6 py-4 rounded-xl border border-border text-text hover:border-mint/30 hover:text-mint transition-all duration-200"
          >
            See how it works
          </a>
        </div>

        {/* Trust micro-copy */}
        <p className="font-mono text-xs text-muted/70 mb-12">
          Free to try · 1 free prediction · No credit card required
        </p>

        {/* Prompt form */}
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3 text-left">
            Or try it right now
          </p>
          <form onSubmit={onSubmit}>
            <div className="relative rounded-2xl border border-border bg-surface/80 backdrop-blur-sm p-2 shadow-card focus-within:border-mint/40 transition-colors duration-200">
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. 'If a product raises its price next quarter, how will customer sentiment evolve over six months?'"
                className="bg-transparent text-text placeholder:text-muted/50 resize-none w-full px-3 py-2 focus:outline-none font-body text-sm leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Attach a file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  {file && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
                      <FileText className="w-3 h-3" aria-hidden />
                      {file.name}
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="ml-1 text-muted hover:text-coral transition-colors"
                        aria-label="Remove file"
                      >×</button>
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-muted/40">PDF · MD · TXT</span>
                </div>
                <Button type="submit" variant="primary" size="sm" disabled={!prompt.trim()}>
                  <Zap className="w-4 h-4" />
                  Predict
                </Button>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.md,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-hidden
            />
          </form>
        </div>
      </div>
    </section>
  );
}

/* ─── Social Proof Bar ──────────────────────────────────────────────────────── */
function SocialProofBar() {
  return (
    <div className="border-y border-border bg-surface/50 backdrop-blur-sm py-5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          {[
            { icon: <Users className="w-4 h-4 text-mint" />, label: '120+ users already predicting' },
            { icon: <Shield className="w-4 h-4 text-periwinkle" />, label: 'Powered by multi-agent AI' },
            { icon: <TrendingUp className="w-4 h-4 text-coral" />, label: 'Real simulation — not just LLM output' },
            { icon: <Lock className="w-4 h-4 text-amber" />, label: 'Your data stays private' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              {icon}
              <span className="font-mono text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── How It Works ──────────────────────────────────────────────────────────── */
const STEPS = [
  {
    num: '01',
    icon: <Brain className="w-6 h-6" />,
    title: 'Seed Analysis',
    desc: 'Your scenario is decomposed into predictive parameters, key entities, and causal relationships through ontology generation.',
    color: 'mint',
    bgColor: 'bg-mint/10',
    borderColor: 'border-mint/20',
    textColor: 'text-mint',
  },
  {
    num: '02',
    icon: <GitBranch className="w-6 h-6" />,
    title: 'Graph Building',
    desc: 'A structured knowledge graph maps every stakeholder, influence, and feedback loop within your scenario.',
    color: 'periwinkle',
    bgColor: 'bg-periwinkle/10',
    borderColor: 'border-periwinkle/20',
    textColor: 'text-periwinkle',
  },
  {
    num: '03',
    icon: <Bot className="w-6 h-6" />,
    title: 'Multi-Agent Simulation',
    desc: 'Independent AI agents simulate competing viewpoints, market forces, and human behaviours across multiple rounds.',
    color: 'coral',
    bgColor: 'bg-coral/10',
    borderColor: 'border-coral/20',
    textColor: 'text-coral',
  },
  {
    num: '04',
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Prediction Report',
    desc: 'A confidence-scored structured report is generated with actionable insights — then you can chat with it to go deeper.',
    color: 'amber',
    bgColor: 'bg-amber/10',
    borderColor: 'border-amber/20',
    textColor: 'text-amber',
  },
];

function HowItWorksSection() {
  const { ref, inView } = useInView();
  return (
    <section id="how-it-works" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto" ref={ref}>
        <div className={cn('text-center mb-16 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
          <p className="font-mono text-xs text-mint uppercase tracking-[0.2em] mb-4">How It Works</p>
          <h2 className="font-display font-800 text-3xl sm:text-4xl lg:text-5xl text-bright mb-5">
            From question to prediction<br className="hidden sm:block" /> in minutes
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed">
            Not just an LLM generating text. A full simulation pipeline that models cause and effect.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6 relative">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-mint/30 via-periwinkle/30 via-coral/30 to-amber/30 pointer-events-none" aria-hidden />

          {STEPS.map(({ num, icon, title, desc, bgColor, borderColor, textColor }, i) => (
            <div
              key={num}
              className={cn(
                'relative p-6 rounded-2xl border bg-card backdrop-blur-sm transition-all duration-700 hover:-translate-y-1',
                borderColor,
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
              )}
              style={{ transitionDelay: inView ? `${i * 100}ms` : '0ms' }}
            >
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-5', bgColor, textColor)}>
                {icon}
              </div>
              <span className={cn('font-mono text-xs mb-2 block', textColor)}>{num}</span>
              <h3 className="font-display font-700 text-bright text-base mb-3">{title}</h3>
              <p className="font-body text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Example Predictions ───────────────────────────────────────────────────── */
const EXAMPLE_CARDS = [
  {
    category: 'Business Strategy',
    categoryColor: 'text-mint bg-mint/10 border-mint/20',
    prompt: 'If a SaaS product raises its price by 30% next quarter, how will customer sentiment and churn evolve over six months?',
    insights: [
      { label: 'Churn risk window', value: 'Weeks 3–8', color: 'text-coral' },
      { label: 'Price-sensitive segment', value: '~22% of base', color: 'text-amber' },
      { label: 'Brand loyalty retention', value: 'High (top 40%)', color: 'text-mint' },
      { label: 'Revenue net change', value: '+11% projected', color: 'text-periwinkle' },
    ],
    confidence: 78,
  },
  {
    category: 'Workplace Dynamics',
    categoryColor: 'text-periwinkle bg-periwinkle/10 border-periwinkle/20',
    prompt: 'What happens to productivity if a remote-first company mandates two days per week in-office starting next quarter?',
    insights: [
      { label: 'Initial productivity drop', value: '8–15% (Month 1)', color: 'text-coral' },
      { label: 'Top performer risk', value: 'Elevated', color: 'text-amber' },
      { label: 'Morale recovery', value: '10–14 weeks', color: 'text-mint' },
      { label: 'Attrition increase', value: '6–12% annualised', color: 'text-periwinkle' },
    ],
    confidence: 71,
  },
  {
    category: 'Technology Adoption',
    categoryColor: 'text-amber bg-amber/10 border-amber/20',
    prompt: 'How will adoption of a new open-source AI framework progress if a major tech company backs it over the next 18 months?',
    insights: [
      { label: 'Adoption curve shape', value: 'S-curve, Month 6+', color: 'text-mint' },
      { label: 'Community growth', value: '340% projected', color: 'text-periwinkle' },
      { label: 'Enterprise lag', value: '6–9 months', color: 'text-amber' },
      { label: 'Competing frameworks', value: '2 likely forked', color: 'text-coral' },
    ],
    confidence: 65,
  },
];

function ExamplesSection({ onSelect }: { onSelect: (p: string) => void }) {
  const { ref, inView } = useInView();
  return (
    <section id="examples" className="relative py-32 px-6">
      <div className="absolute inset-0 bg-surface/40 pointer-events-none" aria-hidden />
      <div className="max-w-7xl mx-auto relative" ref={ref}>
        <div className={cn('text-center mb-16 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
          <p className="font-mono text-xs text-mint uppercase tracking-[0.2em] mb-4">See It In Action</p>
          <h2 className="font-display font-800 text-3xl sm:text-4xl lg:text-5xl text-bright mb-5">
            Real predictions, real depth
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed">
            Each prediction runs a full simulation. Here&apos;s a preview of what the reports look like.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {EXAMPLE_CARDS.map(({ category, categoryColor, prompt, insights, confidence }, i) => (
            <div
              key={category}
              className={cn(
                'flex flex-col rounded-2xl border border-border bg-card overflow-hidden group transition-all duration-700',
                'hover:border-mint/20 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: inView ? `${i * 120}ms` : '0ms' }}
            >
              {/* Card header */}
              <div className="p-5 border-b border-border">
                <span className={cn('inline-flex items-center font-mono text-xs px-2.5 py-1 rounded-full border mb-3', categoryColor)}>
                  {category}
                </span>
                <p className="font-body text-sm text-text leading-relaxed line-clamp-3">{prompt}</p>
              </div>

              {/* Report preview */}
              <div className="flex-1 p-5 space-y-3">
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-4">Report Preview</p>
                {insights.map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">{label}</span>
                    <span className={cn('font-mono text-xs font-600', color)}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Confidence + CTA */}
              <div className="p-5 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-mint transition-all duration-1000" style={{ width: inView ? `${confidence}%` : '0%' }} />
                  </div>
                  <span className="font-mono text-xs text-muted">{confidence}% confidence</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(prompt)}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-mint hover:text-bright transition-colors group/btn"
                >
                  Try this
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ───────────────────────────────────────────────────────────────── */
function PricingSection() {
  const { ref, inView } = useInView();
  return (
    <section id="pricing" className="relative py-32 px-6">
      <div className="absolute inset-0 bg-radial-mint opacity-50 pointer-events-none" aria-hidden />
      <div className="max-w-7xl mx-auto relative" ref={ref}>
        <div className={cn('text-center mb-16 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
          <p className="font-mono text-xs text-mint uppercase tracking-[0.2em] mb-4">Pricing</p>
          <h2 className="font-display font-800 text-3xl sm:text-4xl lg:text-5xl text-bright mb-5">
            Simple, transparent pricing
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed">
            Pay per prediction or go unlimited. Start free — no credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Subscription — spans first or last, featured */}
          <div className="lg:col-span-1 lg:order-last flex flex-col rounded-2xl border border-mint/30 bg-gradient-to-b from-mint/8 to-card relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-mint/60 to-transparent" aria-hidden />
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="font-display font-700 text-bright text-base">{SUBSCRIPTION_PLAN.label}</span>
                <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-full bg-mint/15 border border-mint/25 text-mint">
                  <Star className="w-2.5 h-2.5 fill-mint" />
                  Best value
                </span>
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className="font-display font-800 text-4xl text-bright">${SUBSCRIPTION_PLAN.price}</span>
                <span className="font-mono text-xs text-muted mb-1.5">/month</span>
              </div>
              <p className="font-body text-sm text-muted mb-6">{SUBSCRIPTION_PLAN.description}</p>
              <ul className="space-y-2.5">
                {[
                  'Unlimited predictions',
                  'Priority simulation slots',
                  'Full report history',
                  'Chat with any past report',
                  'Cancel anytime',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-mint/15 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-mint" />
                    </div>
                    <span className="font-body text-sm text-text">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5">
              <Link
                href="/chat"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-mint text-bg font-display font-700 text-sm hover:bg-mint-dim shadow-glow-mint transition-all duration-200"
              >
                <Sparkles className="w-4 h-4" />
                Get Unlimited Access
              </Link>
            </div>
          </div>

          {/* Credit packages */}
          {CREDIT_PACKAGES.map((pkg, i) => {
            const perCredit = (pkg.price / pkg.credits).toFixed(2);
            return (
              <div
                key={pkg.id}
                className={cn(
                  'flex flex-col rounded-2xl border border-border bg-card transition-all duration-700',
                  'hover:border-mint/20 hover:-translate-y-0.5',
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                )}
                style={{ transitionDelay: inView ? `${i * 80}ms` : '0ms' }}
              >
                <div className="p-6 flex-1">
                  <div className="mb-4">
                    <span className="font-display font-700 text-bright text-base">{pkg.label}</span>
                  </div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="font-display font-800 text-3xl text-bright">${pkg.price}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-mint">
                      <Zap className="w-3 h-3" />{pkg.credits} credits
                    </span>
                    <span className="font-mono text-xs text-muted/50">·</span>
                    <span className="font-mono text-xs text-muted">${perCredit}/credit</span>
                  </div>
                  <ul className="space-y-2">
                    {[
                      `${pkg.credits} simulations`,
                      'Full pipeline per run',
                      'Report + chat included',
                      'Credits never expire',
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="font-body text-sm text-muted">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-5">
                  <Link
                    href="/chat"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-text font-display font-600 text-sm hover:border-mint/30 hover:text-mint transition-all duration-200"
                  >
                    Buy Credits
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Free tier note */}
        <p className="text-center font-mono text-xs text-muted mt-8">
          Everyone gets <span className="text-mint">1 free prediction</span> on signup. No credit card required.
        </p>
      </div>
    </section>
  );
}

/* ─── FAQ ───────────────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: 'How many free predictions do I get?',
    a: 'Every new account gets 1 free prediction credit at sign-up — no payment information required. After that you can buy credit packs starting at $2.99 or subscribe for unlimited access at $29.99/month.',
  },
  {
    q: 'What kinds of questions can MiroFish predict?',
    a: 'Any scenario involving cause-and-effect dynamics: business strategy, market behaviour, organisational change, policy impact, technology adoption, or competitive dynamics. The more specific your question, the better the simulation.',
  },
  {
    q: 'How accurate are the predictions?',
    a: 'MiroFish generates confidence-scored outputs, not deterministic forecasts. Accuracy depends on scenario complexity and how well it maps to known causal patterns. Reports include confidence percentages and uncertainty ranges so you always know the limits.',
  },
  {
    q: 'How long does a prediction take?',
    a: 'Typically 2–10 minutes for a full simulation. Complex scenarios with many agents and rounds can take up to 30 minutes. You\'ll see real-time progress in the pipeline sidebar as each stage completes.',
  },
  {
    q: 'Can I attach my own documents to seed the analysis?',
    a: 'Yes. You can upload PDF, Markdown, or plain text files alongside your prompt. The ontology engine uses your documents as primary context, resulting in more domain-specific and accurate simulations.',
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  const { ref, inView } = useInView();
  return (
    <section id="faq" className="relative py-32 px-6">
      <div className="absolute inset-0 bg-surface/30 pointer-events-none" aria-hidden />
      <div className="max-w-3xl mx-auto relative">
        <div ref={ref} className={cn('text-center mb-14 transition-all duration-700', inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
          <p className="font-mono text-xs text-mint uppercase tracking-[0.2em] mb-4">FAQ</p>
          <h2 className="font-display font-800 text-3xl sm:text-4xl text-bright">
            Common questions
          </h2>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <div
              key={q}
              className="rounded-2xl border border-border bg-card overflow-hidden transition-colors hover:border-mint/15"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-display font-600 text-text text-sm pr-4">{q}</span>
                <ChevronDown className={cn('w-4 h-4 text-muted shrink-0 transition-transform duration-300', open === i && 'rotate-180')} />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="font-body text-sm text-muted leading-relaxed">{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Banner ────────────────────────────────────────────────────────────── */
function CTABanner() {
  const { ref, inView } = useInView();
  return (
    <section className="py-24 px-6">
      <div
        ref={ref}
        className={cn(
          'max-w-4xl mx-auto rounded-3xl border border-mint/20 bg-gradient-to-b from-mint/8 to-card relative overflow-hidden p-12 text-center transition-all duration-700',
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        )}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-mint/50 to-transparent" aria-hidden />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-mint/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-mint/20 bg-mint/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse-slow" aria-hidden />
            <span className="font-mono text-xs text-mint">Ready to predict the future?</span>
          </div>
          <h2 className="font-display font-800 text-3xl sm:text-4xl text-bright mb-4">
            Start your first simulation today
          </h2>
          <p className="text-muted text-lg max-w-lg mx-auto mb-8">
            Join 120+ analysts, strategists, and researchers already using MiroFish to stress-test their assumptions.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2.5 font-display font-700 text-base px-8 py-4 rounded-xl bg-mint text-bg hover:bg-mint-dim shadow-glow-mint transition-all duration-200 group"
          >
            Start Your First Prediction
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="font-mono text-xs text-muted/60 mt-5">1 free prediction · No credit card</p>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-border bg-surface/30 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 mb-3 select-none group">
              <svg width="24" height="17" viewBox="0 0 28 20" fill="none" aria-hidden>
                <polygon points="2,2 2,18 22,10" fill="#64FFDA" opacity="0.9" />
                <polygon points="22,4 22,16 27,10" fill="#64FFDA" opacity="0.55" />
              </svg>
              <span className="font-display font-700 text-base text-bright">MiroFish</span>
              <span className="font-mono text-xs text-mint/60 -ml-0.5">.us</span>
            </Link>
            <p className="font-body text-sm text-muted leading-relaxed">
              Multi-agent AI simulation for predicting how any scenario plays out.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <p className="font-mono text-xs text-muted/50 uppercase tracking-widest mb-3">Product</p>
              <div className="space-y-2">
                <a href="#how-it-works" className="block font-body text-sm text-muted hover:text-text transition-colors">How It Works</a>
                <a href="#examples" className="block font-body text-sm text-muted hover:text-text transition-colors">Examples</a>
                <a href="#pricing" className="block font-body text-sm text-muted hover:text-text transition-colors">Pricing</a>
                <a href="#faq" className="block font-body text-sm text-muted hover:text-text transition-colors">FAQ</a>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs text-muted/50 uppercase tracking-widest mb-3">Account</p>
              <div className="space-y-2">
                <Link href="/auth/signin" className="block font-body text-sm text-muted hover:text-text transition-colors">Sign In</Link>
                <Link href="/chat" className="block font-body text-sm text-muted hover:text-text transition-colors">Start Predicting</Link>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs text-muted/50 uppercase tracking-widest mb-3">Open Source</p>
              <div className="space-y-2">
                <a
                  href="https://github.com/666ghj/MiroFish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-body text-sm text-muted hover:text-text transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <p className="font-mono text-xs text-muted/40">© 2025 MiroFish. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse-slow" aria-hidden />
            <span className="font-mono text-xs text-muted/50">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Root Page ─────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && ['.pdf', '.md', '.txt'].includes('.' + f.name.split('.').pop()?.toLowerCase())) {
      setFile(f);
    }
  }, []);

  async function navigateToChat(p: string, f?: File | null) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    const params = new URLSearchParams({ prompt: encodeURIComponent(p.trim()) });
    if (f) params.set('filename', encodeURIComponent(f.name));
    router.push(`/chat?${params.toString()}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    await navigateToChat(prompt, file);
  }

  return (
    <div
      className="min-h-screen bg-bg text-text font-body"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Header />
      <HeroSection
        prompt={prompt}
        setPrompt={setPrompt}
        file={file}
        setFile={setFile}
        isDragging={isDragging}
        onSubmit={handleSubmit}
      />
      <SocialProofBar />
      <HowItWorksSection />
      <ExamplesSection onSelect={(p) => navigateToChat(p)} />
      <PricingSection />
      <FAQSection />
      <CTABanner />
      <Footer />
    </div>
  );
}
