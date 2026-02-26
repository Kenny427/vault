import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Passive Copilot',
  description: 'OSRS passive flipping decision support powered by DINK + OSRS Wiki prices.',
};

const themeInitScript = `(() => {
  try {
    const stored = localStorage.getItem('vault-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (_) {
    // ignore
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
