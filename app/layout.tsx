import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/navbar";
import { FirebaseProvider } from "@/lib/firebase-provider";
import DebugHelper from "@/lib/debug-helper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Party Game Store",
  description: "A virtual store for party games with challenges",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FirebaseProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <div className="flex-1">{children}</div>
              <DebugHelper />
            </div>
          </FirebaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
