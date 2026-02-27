/**
 * Format a number with compact notation (e.g., 1.2M, 500K)
 * Uses OSRS-style formatting: K for thousands, M for millions, B for billions
 */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + 'B';
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  }
  if (value >= 10_000) {
    return (value / 1_000).toFixed(1) + 'K';
  }
  return value.toLocaleString();
}

/**
 * Format gp value - shows compact for large numbers
 */
export function formatGp(value: number): string {
  if (!Number.isFinite(value)) return '0 gp';
  if (value >= 1_000_000) {
    return formatCompactNumber(value) + ' gp';
  }
  return value.toLocaleString() + ' gp';
}
