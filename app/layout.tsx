import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";

export const metadata: Metadata = {
  title: "Vault",
  description: "Advanced price tracking and flip opportunity detection for OSRS Grand Exchange",
  icons: {
    icon: "/favicon.svg",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
