'use client';

import { HTMLAttributes, forwardRef } from 'react';

/* ============================================
   BADGE COMPONENT - Futuristic Terminal Style
   ============================================ */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge variant */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'secondary';
  /** Badge size */
  size?: 'sm' | 'md';
  /** Pulse animation for important badges */
  pulse?: boolean;
  /** Glow effect */
  glow?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    children, 
    variant = 'default',
    size = 'md',
    pulse = false,
    glow = false,
    className = '',
    ...props 
  }, ref) => {
    
    const baseStyles = `
      inline-flex items-center justify-center font-bold
      rounded-full tracking-wide
      transition-all duration-150
    `;
    
    const variantStyles = {
      default: `
        bg-surface-2 text-text-muted
        dark:bg-surface-2/80 dark:text-text-muted
      `,
      success: `
        bg-success/15 text-success
        dark:bg-success/20 dark:text-success-muted
        dark:border dark:border-success/30
      `,
      warning: `
        bg-warning/15 text-warning
        dark:bg-warning/20 dark:text-warning
        dark:border dark:border-warning/30
      `,
      danger: `
        bg-danger/15 text-danger
        dark:bg-danger/20 dark:text-danger
        dark:border dark:border-danger/30
      `,
      info: `
        bg-info/15 text-info
        dark:bg-info/20 dark:text-info
        dark:border dark:border-info/30
      `,
      accent: `
        bg-accent/15 text-accent
        dark:bg-accent/20 dark:text-accent-2
        dark:border dark:border-accent/30
      `,
      secondary: `
        bg-secondary/15 text-secondary
        dark:bg-secondary/20 dark:text-secondary
        dark:border dark:border-secondary/30
      `,
    };
    
    const sizeStyles = {
      sm: 'text-[10px] px-1.5 py-0.5',
      md: 'text-xs px-2 py-0.5',
    };
    
    const pulseStyles = pulse ? `
      animate-pulse
    ` : '';
    
    const glowStyles = glow ? `
      shadow-[0_0_8px_var(--glow-accent)]
      dark:shadow-[0_0_12px_rgba(212,167,83,0.4)]
    ` : '';
    
    return (
      <span
        ref={ref}
        className={`
          ${baseStyles} 
          ${variantStyles[variant]} 
          ${sizeStyles[size]}
          ${pulseStyles}
          ${glowStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
