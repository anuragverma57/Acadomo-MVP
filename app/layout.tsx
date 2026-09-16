import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import { BottomNav } from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { currentStudent } from "@/lib/session";

import "./globals.css";

// Space Grotesk for display: geometric and memorable, so headings read as
// composed rather than default. Inter for everything else — neutral and
// exceptional at small sizes, which is most of a listings UI.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
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
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
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
