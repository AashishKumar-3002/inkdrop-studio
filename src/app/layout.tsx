import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inkdrop Studio",
  description: "Ideate, build a story bible, and draft chapters with AI assistance.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
