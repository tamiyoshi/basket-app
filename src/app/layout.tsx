import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { AppSplash } from "@/components/layout/app-splash";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Street Court Explorer",
    template: "%s | Street Court Explorer",
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
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="flex min-h-screen flex-col">
          <AppSplash />
          <SiteHeader />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
              {children}
            </div>
          </main>
          <footer className="border-t bg-background/80 py-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Street Court Explorer
          </footer>
        </div>
      </body>
    </html>
  );
}
