import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'sage';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-bg hover:bg-accent-hover',
  secondary: 'bg-surface-2 text-text border border-border hover:border-accent/50',
  danger: 'bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  sage: 'bg-sage/20 text-sage border border-sage/30 hover:bg-sage/30',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`pill-btn ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function IconButton({ variant = 'ghost', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center w-9 h-9 rounded-pill transition-all duration-150 active:scale-90 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
