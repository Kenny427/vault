'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/components/Dashboard';
import { useState } from 'react';

export default function Home() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
