import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/ui/AppShell';
import CommandPalette from '@/components/ui/CommandPalette';

export const metadata: Metadata = {
  title: 'Vault',
  description: 'OSRS passive flipping decision support powered by DINK + OSRS Wiki prices.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
        <CommandPalette />
      </body>
    </html>
  );
}
