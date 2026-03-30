'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CREDIT_PACKAGES } from '@/lib/credits';

type Package = (typeof CREDIT_PACKAGES)[number];

interface PackageCardProps {
  pkg: Package;
  selected: boolean;
  onSelect: () => void;
}

export default function PackageCard({ pkg, selected, onSelect }: PackageCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative w-full text-left p-4 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint',
        selected
          ? 'border-mint/40 bg-mint/5 shadow-glow-mint'
          : 'border-border bg-card hover:border-mint/20 hover:bg-card-hover',
        'popular' in pkg && pkg.popular && !selected && 'border-periwinkle/30'
      )}
    >
      {'popular' in pkg && pkg.popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-periwinkle text-bg font-mono text-[10px] font-600">
          Popular
        </span>
      )}

      <div className="flex items-center justify-between mb-1">
        <span className="font-display font-600 text-sm text-bright">{pkg.label}</span>
        {selected && <Check className="w-4 h-4 text-mint shrink-0" />}
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="font-display font-700 text-2xl text-bright">${pkg.price}</span>
      </div>

      <p className="font-mono text-xs text-muted">
        {pkg.credits} credits · ${(pkg.price / pkg.credits).toFixed(2)}/credit
      </p>
    </button>
  );
}
