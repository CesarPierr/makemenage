import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import "./globals.css";
import { ThemeProvider, ThemeScript } from "@/components/shared/theme-provider";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MakeMenage",
    template: "%s · MakeMenage",
  },
  description: "Répartissez les tâches ménagères équitablement. Planning automatique, rotation juste et vue calendrier — pensé pour le mobile.",
  keywords: ["tâches ménagères", "planning familial", "répartition tâches", "gestion foyer", "colocation"],
  authors: [{ name: "MakeMenage" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MakeMenage",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "MakeMenage — Planning ménager équitable",
    description: "Répartissez les tâches ménagères équitablement. Planning automatique, rotation juste et vue calendrier.",
    siteName: "MakeMenage",
  },
  twitter: {
    card: "summary",
    title: "MakeMenage",
    description: "Planning ménager équitable pour foyer, couple ou colocation.",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#D8643D" },
    { media: "(prefers-color-scheme: dark)", color: "#e8704f" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable} h-full`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-sand-50 text-ink-950 antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
