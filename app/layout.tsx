import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BottomNav } from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { currentStudent } from "@/lib/session";

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
    default: "AcaDomo — Student Accommodation",
    template: "%s · AcaDomo",
  },
  description:
    "Discover, compare and enquire about student accommodation across global study destinations.",
  applicationName: "AcaDomo",
  appleWebApp: {
    capable: true,
    title: "AcaDomo",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // viewport-fit=cover is what makes env(safe-area-inset-*) resolve to real
  // values on notched devices; without it the bottom nav sits under the home
  // indicator once installed.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const student = await currentStudent();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader studentEmail={student?.email} />
          <main className="flex-1">{children}</main>
          <BottomNav />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
