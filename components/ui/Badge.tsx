'use client';

import { HTMLAttributes, forwardRef } from 'react';

/* ============================================
   BADGE COMPONENT
   ============================================ */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge variant */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'secondary';
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
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
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    `;
    
    const variantStyles = {
      default: `
        bg-surface-2 text-text-muted
        dark:bg-surface-3 dark:text-text-muted
      `,
      success: `
        bg-success/15 text-success
        dark:bg-success/20 dark:text-success-muted
        ${glow ? 'shadow-glow-secondary' : ''}
      `,
      warning: `
        bg-warning/15 text-warning
        dark:bg-warning/20 dark:text-warning
        ${glow ? 'shadow-glow-warning' : ''}
      `,
      danger: `
        bg-danger/15 text-danger
        dark:bg-danger/20 dark:text-danger
        ${glow ? 'shadow-glow-danger' : ''}
      `,
      info: `
        bg-info/15 text-info
        dark:bg-info/20 dark:text-info
      `,
      accent: `
        bg-accent/15 text-accent
        dark:bg-accent/20 dark:text-accent-muted
        ${glow ? 'shadow-glow-accent' : ''}
      `,
      secondary: `
        bg-secondary/15 text-secondary
        dark:bg-secondary/20 dark:text-secondary-muted
        ${glow ? 'shadow-glow-secondary' : ''}
      `,
    };
    
    const sizeStyles = {
      sm: 'text-[10px] px-1.5 py-0.5',
      md: 'text-xs px-2 py-0.5',
      lg: 'text-sm px-2.5 py-1',
    };
    
    const pulseStyles = pulse ? `
      animate-pulse-glow
    ` : '';
    
    return (
      <span
        ref={ref}
        className={`
          ${baseStyles} 
          ${variantStyles[variant]} 
          ${sizeStyles[size]}
          ${pulseStyles}
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
