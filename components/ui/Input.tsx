'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

/* ============================================
   INPUT COMPONENT
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
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;
    
    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5',
      md: 'text-sm px-3 py-2',
      lg: 'text-base px-4 py-2.5',
    };
    
    const stateStyles = error ? `
      border-danger focus-visible:border-danger focus-visible:ring-danger/50 focus-visible:ring-offset-surface
      dark:shadow-glow-danger/30
    ` : `
      border-border
      hover:border-text-muted/60
      focus-visible:border-accent focus-visible:ring-accent/30 focus-visible:ring-offset-surface
      dark:border-border/40 dark:hover:border-text-muted/30
      ${glow ? 'focus-visible:shadow-glow-accent' : ''}
    `;
    
    return (
      <input
        ref={ref}
        className={`
          ${baseStyles} 
          ${sizeStyles[size]}
          ${stateStyles}
          ${className}
        `}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

/* ============================================
   INPUT GROUP COMPONENT
   ============================================ */

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helper?: string;
}

const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ 
    label,
    error,
    helper,
    children,
    className = '',
    ...props 
  }, ref) => {
    return (
      <div ref={ref} className={`space-y-1.5 ${className}`} {...props}>
        {label && (
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide">
            {label}
          </label>
        )}
        {children}
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}
        {helper && !error && (
          <p className="text-xs text-text-muted">{helper}</p>
        )}
      </div>
    );
  }
);

InputGroup.displayName = 'InputGroup';

export { Input, InputGroup };
