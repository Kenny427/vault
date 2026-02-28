'use client';

import { HTMLAttributes, forwardRef } from 'react';

/* ============================================
   CARD COMPONENT
   ============================================ */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: 'default' | 'glass' | 'flat' | 'premium' | 'accent';
  /** Hover effect */
  hoverable?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Glow effect on hover */
  glow?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    variant = 'default',
    hoverable = false,
    padding = 'md',
    glow = false,
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
        dark:bg-surface dark:border-border/20
        dark:shadow-lg dark:shadow-black/25
      `,
      glass: `
        bg-surface/60 border-border/20
        backdrop-blur-xl
        dark:bg-surface/70 dark:border-border/15
        ${!hoverable ? 'dark:shadow-lg dark:shadow-black/20' : ''}
      `,
      flat: `
        bg-surface-2 border-border/30
        dark:bg-surface-2 dark:border-border/10
      `,
      premium: `
        bg-gradient-to-br from-surface to-surface-2
        border-accent/20 dark:border-accent/15
        shadow-[0_4px_20px_rgba(31,138,66,0.08)]
        dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
      `,
      accent: `
        bg-surface border-accent/30
        shadow-[0_4px_20px_rgba(229,185,92,0.1)]
        dark:bg-surface dark:border-accent/25
        dark:shadow-[0_4px_20px_rgba(229,185,92,0.1)]
      `,
    };
    
    const hoverStyles = hoverable ? `
      hover:-translate-y-0.5 
      hover:shadow-lg hover:border-accent/40
      dark:hover:border-accent/30 dark:hover:shadow-card-hover
      cursor-pointer
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:-translate-y-0.5
      ${glow ? 'hover:shadow-glow-accent' : ''}
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

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional accent line */
  accentLine?: boolean;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, accentLine = false, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`
        text-xs font-bold uppercase tracking-widest text-text-muted mb-3
        ${accentLine ? 'border-l-2 border-accent pl-3' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

/* ============================================
   CARD CONTENT
   ============================================ */

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`text-sm text-text ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

/* ============================================
   CARD FOOTER
   ============================================ */

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`mt-4 pt-3 border-t border-border/30 flex items-center gap-2 text-xs text-text-muted ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
