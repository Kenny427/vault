'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/components/Dashboard';
import Auth from '@/components/Auth';
import { useAuth } from '@/lib/authContext';
import { usePortfolioStore } from '@/lib/portfolioStore';
import { useDashboardStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { initializeVisibilityHandler } from '@/lib/visibilityHandler';

export default function Home() {
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

  // Initialize visibility handler once
  useEffect(() => {
    initializeVisibilityHandler();
  }, []);

  // Load data from Supabase when user logs in (only once)
  useEffect(() => {
    if (session && !loading) {
      setSyncing(true);
      Promise.all([
        loadPortfolio(),
        loadFavorites(),
      ]).finally(() => setSyncing(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading]); // Only re-run when session/loading changes

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
