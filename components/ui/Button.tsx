'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

/* ============================================
   BUTTON COMPONENT
   ============================================ */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    disabled,
    className = '',
    ...props 
  }, ref) => {
    
    const baseStyles = `
      inline-flex items-center justify-center font-semibold
      transition-all duration-150 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
      disabled:opacity-65 disabled:cursor-not-allowed
    `;
    
    const variantStyles = {
      primary: `
        bg-accent text-text-inverse
        hover:brightness-110 active:translate-y-px
        dark:bg-gradient-to-br dark:from-accent dark:to-accent-2
        dark:shadow-lg dark:shadow-accent/30
        focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface
      `,
      secondary: `
        bg-surface-2 text-text border border-border
        hover:bg-surface hover:border-accent
        dark:bg-surface-2 dark:border-border/40
        dark:hover:bg-surface-3 dark:hover:border-accent
        focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 dark:focus-visible:ring-offset-surface
      `,
      ghost: `
        bg-transparent text-text-muted
        hover:bg-surface-2 hover:text-text
        dark:hover:bg-surface-2 dark:hover:text-text
        focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-surface
      `,
      danger: `
        bg-danger text-white
        hover:brightness-110 active:translate-y-px
        focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface
      `,
    };
    
    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 rounded-lg',
      md: 'text-sm px-3.5 py-2 rounded-lg',
      lg: 'text-base px-5 py-2.5 rounded-xl',
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
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
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
