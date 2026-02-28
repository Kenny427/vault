'use client';

import { useState, useRef, ReactNode } from 'react';

/* ============================================
   TOOLTIP COMPONENT
   ============================================ */

export interface TooltipProps {
  /** Tooltip content */
  content: ReactNode;
  /** Child element that triggers tooltip */
  children: ReactNode;
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Additional className */
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[6px]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[6px]',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[6px]',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[6px]',
  };

  return (
    <span
      ref={triggerRef}
      className={`inline-flex relative ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <>
          <span
            className={`
              absolute z-[100] whitespace-nowrap
              px-2.5 py-1.5 rounded-lg
              text-xs font-semibold
              bg-surface-2 dark:bg-surface-3
              text-text dark:text-text-muted
              border border-border/50 dark:border-border/20
              shadow-lg dark:shadow-black/40
              animate-fade-in
              ${positionStyles[position]}
            `}
            role="tooltip"
          >
            {content}
          </span>
          <span
            className={`
              absolute z-[99] w-0 h-0
              border-l-[6px] border-r-[6px] border-b-[6px]
              border-l-transparent border-r-transparent
              bg-transparent
              dark:border-surface-3
              ${arrowStyles[position]}
            `}
          />
        </>
      )}

      <style jsx>{`
        :global(.animate-fade-in) {
          animation: tooltipFadeIn 120ms ease-out;
        }
        
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        :global(.animate-fade-in.bottom) {
          transform: translateX(-50%) translateY(-4px);
        }
        
        :global(.animate-fade-in.left) {
          transform: translateY(-50%) translateX(4px);
        }
        
        :global(.animate-fade-in.right) {
          transform: translateY(-50%) translateX(-4px);
        }
      `}</style>
    </span>
  );
}

/* ============================================
   TOOLTIP GROUP (for richer content)
   ============================================ */

export interface TooltipGroupProps {
  children: ReactNode;
  className?: string;
}

export function TooltipGroup({ children, className = '' }: TooltipGroupProps) {
  return (
    <div className={`inline-flex gap-1 ${className}`}>
      {children}
    </div>
  );
}
