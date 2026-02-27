'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

/* ============================================
   INPUT COMPONENT - Futuristic Terminal Style
   ============================================ */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
  /** Glow effect on focus */
  glow?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    size = 'md',
    error = false,
    glow = false,
    className = '',
    ...props 
  }, ref) => {
    
    const baseStyles = `
      w-full rounded-lg border bg-surface
      text-text font-normal
      transition-all duration-150 ease-out
      placeholder:text-text-muted/50
      focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
      disabled:opacity-50 disabled:cursor-not-allowed
    `;
    
    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5',
      md: 'text-sm px-3 py-2',
      lg: 'text-base px-4 py-2.5',
    };
    
    const stateStyles = error ? `
      border-danger focus-visible:border-danger focus-visible:ring-danger/50
      dark:shadow-[0_0_8px_var(--glow-danger)]
    ` : `
      border-border
      hover:border-text-muted
      focus-visible:border-accent
      dark:border-border/30 dark:hover:border-text-muted/50
    `;
    
    const glowStyles = glow && !error ? `
      dark:shadow-[0_0_10px_var(--glow-accent)]
    ` : '';
    
    return (
      <input
        ref={ref}
        className={`
          ${baseStyles} 
          ${sizeStyles[size]}
          ${stateStyles}
          ${glowStyles}
          ${className}
        `}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
