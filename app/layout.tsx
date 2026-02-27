import type { Metadata } from 'next';
import './globals.css';
import Topbar from '@/components/ui/Topbar';
import CommandPalette from '@/components/ui/CommandPalette';
import ShortcutsOverlay from '@/components/ui/ShortcutsOverlay';

export const metadata: Metadata = {
  title: 'Vault',
  description: 'OSRS passive flipping decision support powered by DINK + OSRS Wiki prices.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Topbar />
        <main>{children}</main>
        <CommandPalette />
        <ShortcutsOverlay />
      </body>
    </html>
  );
}
