import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from "@/components/game/ToastContainer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Крестики-Нолики Онлайн",
  description: "Онлайн игра крестики-нолики с multiplayer, чатом и ботами",
  keywords: ["крестики-нолики", "онлайн игра", "мультиплеер", "tic-tac-toe"],
  authors: [{ name: "DDR_ZIK" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Крестики-Нолики",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Apply theme before paint to avoid FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('ttt_theme');
              // Default to dark theme if not set
              if (!t) t = 'dark';
              if (t === 'dark') document.documentElement.classList.add('dark');
              else if (t === 'light') document.documentElement.classList.add('light');
              // 'system': no class, CSS media query handles it
            } catch(e) {
              // Fallback: dark theme
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} antialiased bg-background text-foreground overscroll-none`}
      >
        {children}
        <Toaster />
        <ToastContainer />
      </body>
    </html>
  );
}
