import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vault',
  description: 'OSRS passive flipping decision support powered by DINK + OSRS Wiki prices.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
