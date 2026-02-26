import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ChatProvider } from "@/lib/chatContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MigrationTrigger } from "@/components/MigrationTrigger";

export const metadata: Metadata = {
  title: "Vault",
  description: "Advanced price tracking and flip opportunity detection for OSRS Grand Exchange",
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.json",
  themeColor: "#eab308",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vault",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <ErrorBoundary>
          <AuthProvider>
            <MigrationTrigger />
            <ChatProvider>
              {children}
            </ChatProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
