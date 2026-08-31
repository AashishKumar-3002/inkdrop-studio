import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider, themeScript } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Inkdrop Studio",
    template: "%s · Inkdrop Studio",
  },
  description:
    "Build your story bible, draft chapters with AI that knows your book, and export a finished manuscript.",
  applicationName: "Inkdrop Studio",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "Inkdrop Studio",
    description:
      "Build your story bible, draft chapters with AI that knows your book, and export a finished manuscript.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script below (and some browser
    // extensions) mutate <html> before React hydrates.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--surface)",
                  color: "var(--ink)",
                  border: "1px solid var(--border)",
                },
              }}
            />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
