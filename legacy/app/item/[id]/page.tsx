'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import ItemPage from '@/components/ItemPage';

export default function ItemDetailPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ItemPage />
    </QueryClientProvider>
  );
}
