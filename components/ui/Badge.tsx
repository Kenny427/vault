'use client';

import { HTMLAttributes, forwardRef } from 'react';

/* ============================================
   BADGE COMPONENT
   ============================================ */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge variant */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  /** Badge size */
  size?: 'sm' | 'md';
  /** Pulse animation for important badges */
  pulse?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    children, 
    variant = 'default',
    size = 'md',
    pulse = false,
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
        dark:bg-surface-3 dark:text-text-muted
      `,
      success: `
        bg-green-100 text-green-800
        dark:bg-green-900/30 dark:text-green-400
      `,
      warning: `
        bg-yellow-100 text-yellow-800
        dark:bg-yellow-900/30 dark:text-yellow-400
      `,
      danger: `
        bg-red-100 text-red-800
        dark:bg-red-900/30 dark:text-red-400
      `,
      info: `
        bg-blue-100 text-blue-800
        dark:bg-blue-900/30 dark:text-blue-400
      `,
      accent: `
        bg-accent/15 text-accent-accent/25
        dark:bg dark:text-accent-2
      `,
    };
    
    const sizeStyles = {
      sm: 'text-[10px] px-1.5 py-0.5',
      md: 'text-xs px-2 py-0.5',
    };
    
    const pulseStyles = pulse ? `
      animate-pulse
      shadow-[0_0_8px_2px_var(--accent-glow)]
      dark:shadow-[0_0_12px_rgba(39,194,103,0.4)]
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
