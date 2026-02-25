'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/components/Dashboard';
import Auth from '@/components/Auth';
import { useAuth } from '@/lib/authContext';
import { usePortfolioStore } from '@/lib/portfolioStore';
import { useDashboardStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';

export default function DashboardPage() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
    },
  }));

  const { session, loading } = useAuth();
  const { loadFromSupabase: loadPortfolio } = usePortfolioStore();
  const { loadFavoritesFromSupabase: loadFavorites } = useDashboardStore();
  const [syncing, setSyncing] = useState(false);
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!session || loading) return;

    const userId = session.user?.id ?? null;
    if (!userId || lastSyncedUserId.current === userId) return;

    lastSyncedUserId.current = userId;
    setSyncing(true);
    Promise.all([loadPortfolio(), loadFavorites()]).finally(() => setSyncing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading]);

  if (loading || syncing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">{loading ? 'Loading...' : 'Syncing your data...'}</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
