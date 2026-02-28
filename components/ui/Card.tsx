'use client';

import { HTMLAttributes, forwardRef } from 'react';

/* ============================================
   CARD COMPONENT - Futuristic Terminal Style
   ============================================ */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: 'default' | 'glass' | 'flat' | 'premium' | 'terminal';
  /** Hover effect */
  hoverable?: boolean;
  /** Glow effect */
  glow?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    variant = 'default',
    hoverable = false,
    glow = false,
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
        shadow-[0_2px_8px_var(--shadow-sm)]
        dark:bg-surface dark:border-border/20
        dark:shadow-lg dark:shadow-black/20
      `,
      glass: `
        bg-surface/60 border-border/20
        backdrop-blur-md
        dark:bg-surface-2/50 dark:border-border/15
      `,
      flat: `
        bg-surface-2 border-border/30
        dark:bg-surface-2 dark:border-border/10
      `,
      premium: `
        bg-gradient-to-br from-surface to-surface-2
        border-accent/20 dark:border-accent/30
        shadow-[0_2px_12px_rgba(0,0,0,0.15)]
        dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)]
      `,
      terminal: `
        bg-surface border-border-accent
        shadow-[0_0_15px_var(--glow-accent)]
        dark:bg-surface dark:border-border-accent
        dark:shadow-[0_0_20px_var(--glow-accent)]
      `,
    };
    
    const hoverStyles = hoverable ? `
      hover:-translate-y-0.5 hover:shadow-lg 
      hover:border-accent/40 dark:hover:border-accent/50
      dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)]
      cursor-pointer
    ` : '';
    
    const glowStyles = glow ? `
      dark:shadow-[0_0_25px_var(--glow-accent-strong)]
      dark:border-accent/40
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
          ${glowStyles}
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

/* ============================================
   CARD TITLE
   ============================================ */

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className = '', ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-lg font-semibold text-text ${className}`}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

/* ============================================
   CARD DESCRIPTION
   ============================================ */

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-text-muted mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

/* ============================================
   CARD CONTENT
   ============================================ */

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`${className}`}
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
      className={`flex items-center gap-3 mt-4 pt-3 border-t border-border/20 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
