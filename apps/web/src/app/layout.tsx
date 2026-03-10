import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";

// Force dynamic rendering - this SPA uses localStorage/auth on all pages
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Iconsai Voz",
  description: "Assistente de voz inteligente para negócios desenvolvido pela Arbache AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IconsAI",
  },
  openGraph: {
    title: "Iconsai Voz",
    description: "Assistente de voz inteligente para negócios desenvolvido pela Arbache AI",
    type: "website",
    images: ["/iconsai-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@IconsAI",
    images: ["/iconsai-logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
      { url: "/apple-touch-icon.png", sizes: "180x180" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0A0E1A" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0E1A" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://gmflpmcepempcygdrayv.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://gmflpmcepempcygdrayv.supabase.co" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
