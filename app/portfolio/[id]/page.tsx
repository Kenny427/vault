'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import PortfolioItemPage from '@/components/PortfolioItemPage';

export default function PortfolioItemDetailPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <PortfolioItemPage />
    </QueryClientProvider>
  );
}
