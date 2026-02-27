'use client';

import { HTMLAttributes, forwardRef } from 'react';

/* ============================================
   CARD COMPONENT
   ============================================ */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: 'default' | 'glass' | 'flat';
  /** Hover effect */
  hoverable?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    variant = 'default',
    hoverable = false,
    padding = 'md',
    className = '',
    ...props 
  }, ref) => {
    
    const baseStyles = `
      rounded-xl border transition-all duration-150 ease-out
    `;
    
    const variantStyles = {
      default: `
        bg-surface border-border
        shadow-[0_4px_12px_var(--shadow-sm)]
        dark:bg-surface-gradient dark:border-border/20
        dark:shadow-lg dark:shadow-black/25
        dark:backdrop-blur-sm
      `,
      glass: `
        bg-surface/80 border-border/30
        backdrop-blur-md
        dark:bg-surface-2/60 dark:border-border/20
      `,
      flat: `
        bg-surface-2 border-border/50
        dark:bg-surface-2 dark:border-border/10
      `,
    };
    
    const hoverStyles = hoverable ? `
      hover:-translate-y-0.5 hover:shadow-lg hover:border-accent/50
      dark:hover:border-accent/40 dark:hover:shadow-accent/10
      cursor-pointer
    ` : '';
    
    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };
    
    return (
      <div
        ref={ref}
        className={`
          ${baseStyles} 
          ${variantStyles[variant]} 
          ${hoverStyles} 
          ${paddingStyles[padding]} 
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/* ============================================
   CARD HEADER
   ============================================ */

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`text-xs font-bold uppercase tracking-widest text-text-muted mb-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export { Card, CardHeader };
