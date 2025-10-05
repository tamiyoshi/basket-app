import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/lib/utils";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HoopSpotter",
    template: "%s | HoopSpotter",
  },
  description: "全国の屋外バスケットコートを探して投稿できるコミュニティアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
              {children}
            </div>
          </main>
          <footer className="border-t bg-background/80 py-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} HoopSpotter
          </footer>
        </div>
      </body>
    </html>
  );
}
