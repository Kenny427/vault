'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

/* ============================================
   BUTTON COMPONENT
   ============================================ */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  loading?: boolean;
  /** Glow effect on hover */
  glow?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    glow = false,
    disabled,
    className = '',
    ...props 
  }, ref) => {
    
    const baseStyles = `
      inline-flex items-center justify-center font-semibold
      transition-all duration-150 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-65 disabled:cursor-not-allowed
    `;
    
    const variantStyles = {
      primary: `
        bg-accent text-text-inverse
        hover:brightness-110 active:translate-y-px
        focus-visible:ring-accent focus-visible:ring-offset-surface
        dark:shadow-glow-accent
        ${glow ? 'hover:shadow-glow-accent-strong' : ''}
      `,
      secondary: `
        bg-surface-2 text-text border border-border
        hover:bg-surface-3 hover:border-accent/50
        dark:bg-surface-2 dark:border-border/30
        dark:hover:bg-surface-3 dark:hover:border-accent/40
        focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface
      `,
      ghost: `
        bg-transparent text-text-muted
        hover:bg-surface-2 hover:text-text
        dark:hover:bg-surface-2 dark:hover:text-text
        focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface
      `,
      danger: `
        bg-danger text-white font-semibold
        hover:brightness-110 active:translate-y-px
        focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface
        dark:shadow-glow-danger
        ${glow ? 'hover:shadow-glow-danger' : ''}
      `,
      accent: `
        bg-secondary text-text-inverse
        hover:brightness-110 active:translate-y-px
        focus-visible:ring-secondary focus-visible:ring-offset-surface
        dark:shadow-glow-secondary
        ${glow ? 'hover:shadow-glow-secondary-strong' : ''}
      `,
    };
    
    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
      md: 'text-sm px-3.5 py-2 rounded-lg gap-2',
      lg: 'text-base px-5 py-2.5 rounded-xl gap-2',
    };
    
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin h-4 w-4" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4" 
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
