'use client';

import { useEffect } from 'react';
import { useChat } from '@/lib/chatContext';

export default function KeyboardShortcuts() {
  const { openChat } = useChat();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K - Open search/chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openChat();
      }

      // Ctrl+/ or Cmd+/ - Open chat
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        openChat();
      }

      // ESC - Close modals (handled by individual components)
      if (e.key === 'Escape') {
        // Let individual components handle this
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openChat]);

  return null; // This component only manages keyboard shortcuts
}
