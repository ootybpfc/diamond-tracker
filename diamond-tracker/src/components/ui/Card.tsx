import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`card p-4 ${onClick ? 'cursor-pointer hover:border-accent/30 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display font-semibold text-text text-base">{title}</h2>
      {action}
    </div>
  );
}
