import type { Metadata } from 'next';
import './globals.css';
import { useState, useEffect } from 'react';

export const metadata: Metadata = {
  title: 'Passive Copilot',
  description: 'OSRS passive flipping decision support powered by DINK + OSRS Wiki prices.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
  };

  return (
    <html lang="en">
      <body className={darkMode ? 'dark' : ''}>
        <button onClick={toggleDarkMode}>Toggle Dark Mode</button>
        {children}
      </body>
    </html>
  );
}
