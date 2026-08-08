import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'accent' | 'sage' | 'clay' | 'danger' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-2 text-muted border-border',
  accent: 'bg-accent/15 text-accent border-accent/30',
  sage: 'bg-sage/15 text-sage border-sage/30',
  clay: 'bg-clay/15 text-clay border-clay/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  muted: 'bg-surface-2 text-muted border-border',
};

export function Badge({ variant = 'default', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-mono font-medium border ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
