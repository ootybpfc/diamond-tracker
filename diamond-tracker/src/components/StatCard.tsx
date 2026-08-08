import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: 'accent' | 'sage' | 'clay';
}

export function StatCard({ label, value, icon, accent = 'accent' }: StatCardProps) {
  const accentColors = {
    accent: 'text-accent',
    sage: 'text-sage',
    clay: 'text-clay',
  };

  return (
    <div className="card p-3.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted text-xs font-mono">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <span className={`font-mono font-semibold text-xl ${accentColors[accent]}`}>{value}</span>
    </div>
  );
}
