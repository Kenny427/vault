'use client';

import { memo } from 'react';

/* ============================================
   SKELETON LOADER COMPONENT
   Modern minimalist loading states
   ============================================ */

interface SkeletonProps {
  /** Skeleton variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Width of skeleton */
  width?: string | number;
  /** Height of skeleton */
  height?: string | number;
  /** Additional className */
  className?: string;
  /** Animation speed: slow | medium | fast */
  animation?: 'slow' | 'medium' | 'fast';
  /** Additional inline styles */
  style?: React.CSSProperties;
}

const Skeleton = memo(function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  animation = 'medium',
  style,
}: SkeletonProps) {
  const baseStyles = `
    relative overflow-hidden
    bg-surface-2
    dark:bg-surface-3
  `;

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationSpeeds = {
    slow: '2s',
    medium: '1.5s',
    fast: '0.8s',
  };

  const skeletonStyle: React.CSSProperties = {
    width: width ?? (variant === 'circular' ? 40 : '100%'),
    height: height ?? (variant === 'text' ? 16 : variant === 'circular' ? 40 : '100%'),
    ...(width && typeof width === 'number' && { width: `${width}px` }),
    ...(height && typeof height === 'number' && { height: `${height}px` }),
    ...style,
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={skeletonStyle}
    >
      {/* Shimmer effect */}
      <div
        className="skeleton-shimmer"
        style={{
          animationDuration: animationSpeeds[animation],
        }}
      />
    </div>
  );
});

/* ============================================
   SKELETON GROUP
   For loading multiple related elements
   ============================================ */

interface SkeletonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const SkeletonGroup = memo(function SkeletonGroup({
  children,
  className = '',
}: SkeletonGroupProps) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>;
});
/* ============================================
   OPPORTUNITY CARD SKELETON
   ============================================ */

interface OpportunitySkeletonProps {
  showActions?: boolean;
}

export const OpportunitySkeleton = memo(function OpportunitySkeleton({
  showActions = true,
}: OpportunitySkeletonProps) {
  return (
    <div
      className="card"
      style={{
        padding: '0.75rem',
        borderLeft: '3px solid var(--border)',
      }}
    >
      {/* Header row */}
      <div className="row-between" style={{ marginBottom: '0.35rem' }}>
        <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton width={120} height={16} />
          <Skeleton width={60} height={18} />
        </div>
        {showActions && (
          <div className="row" style={{ gap: '0.25rem' }}>
            <Skeleton width={40} height={22} />
            <Skeleton width={40} height={22} />
            <Skeleton width={32} height={22} />
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <Skeleton width={40} height={12} className="mb-1" />
            <Skeleton width={60} height={16} />
          </div>
        ))}
      </div>

      {/* Volume row */}
      <div className="row-between" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
        <Skeleton width={100} height={14} />
        <Skeleton width={50} height={14} />
      </div>
    </div>
  );
});

/* ============================================
   PORTFOLIO CARD SKELETON
   ============================================ */

export const PortfolioCardSkeleton = memo(function PortfolioCardSkeleton() {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
      {[...Array(5)].map((_, i) => (
        <article key={i} className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
          <Skeleton width={80} height={12} className="mb-2" />
          <Skeleton width={100} height={24} />
          <Skeleton width={50} height={12} className="mt-2" />
        </article>
      ))}
    </div>
  );
});

export const PortfolioPositionSkeleton = memo(function PortfolioPositionSkeleton() {
  return (
    <div
      className="card"
      style={{
        padding: '0.75rem',
        borderLeft: '3px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="row" style={{ gap: '0.6rem', marginBottom: '0.35rem', alignItems: 'center' }}>
        <Skeleton variant="circular" width={28} height={28} />
        <Skeleton width={100} height={16} />
        <Skeleton width={60} height={14} style={{ marginLeft: 'auto' }} />
      </div>

      {/* Metrics grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <Skeleton width={40} height={10} className="mb-1" />
            <Skeleton width={60} height={14} />
          </div>
        ))}
      </div>

      {/* Sell button */}
      <Skeleton width={60} height={24} className="mt-3" />
    </div>
  );
});

/* ============================================
   ITEM PAGE SKELETON
   ============================================ */

export const ItemPageSkeleton = memo(function ItemPageSkeleton() {
  return (
    <main style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Back link */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Skeleton width={120} height={16} />
      </div>

      {/* Header card */}
      <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <div className="row" style={{ gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Skeleton variant="circular" width={64} height={64} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <Skeleton width={200} height={28} className="mb-2" />
            <div className="row" style={{ gap: '0.75rem', marginTop: '0.25rem' }}>
              <Skeleton width={70} height={20} />
              <Skeleton width={80} height={16} />
              <Skeleton width={60} height={16} />
            </div>
          </div>
          <div className="row" style={{ gap: '0.5rem' }}>
            <Skeleton width={140} height={50} />
            <Skeleton width={50} height={28} />
            <Skeleton width={50} height={28} />
          </div>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <Skeleton width={140} height={28} />
        </div>
      </div>

      {/* Price grid */}
      <div className="grid grid-2" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
        {[...Array(8)].map((_, i) => (
          <article key={i} className="card">
            <Skeleton width={80} height={12} className="mb-2" />
            <Skeleton width={100} height={24} />
          </article>
        ))}
      </div>

      {/* Stats card */}
      <article className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <Skeleton width={150} height={18} className="mb-4" />
        <div className="grid grid-3" style={{ gap: '0.75rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <Skeleton width={50} height={12} className="mx-auto mb-2" />
              <Skeleton width={80} height={20} className="mx-auto" />
            </div>
          ))}
        </div>
      </article>

      {/* Signals panel */}
      <article className="card" style={{ marginBottom: '1rem' }}>
        <Skeleton width={120} height={18} className="mb-4" />
        <div className="grid grid-2" style={{ gap: '0.5rem' }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} width="100%" height={60} />
          ))}
        </div>
      </article>

      {/* Chart */}
      <article className="card" style={{ marginBottom: '1rem' }}>
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <Skeleton width={120} height={18} />
          <div className="row" style={{ gap: '0.25rem' }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} width={32} height={24} />
            ))}
          </div>
        </div>
        <Skeleton width="100%" height={320} />
      </article>
    </main>
  );
});

/* ============================================
   DASHBOARD SUMMARY SKELETON
   ============================================ */

export const DashboardSummarySkeleton = memo(function DashboardSummarySkeleton() {
  return (
    <article className="card" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
      <div className="row-between">
        <div>
          <Skeleton width={100} height={14} className="mb-2" />
          <Skeleton width={80} height={32} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <Skeleton width={110} height={14} className="mb-2" />
          <Skeleton width={100} height={24} />
        </div>
      </div>
    </article>
  );
});

/* ============================================
   TAB SKELETON
   ============================================ */

export const TabSkeleton = memo(function TabSkeleton() {
  return (
    <div className="tabs" style={{ marginBottom: '1rem' }}>
      <div className="row" style={{ gap: '0.5rem' }}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} width={80} height={32} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
});

export default Skeleton;
