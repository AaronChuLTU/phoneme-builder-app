/**
 * Root layout — wraps every page in the app.
 *
 * Header, NavBar and Footer are written once here and appear on all five
 * pages, which is where the app gets its shared shell.
 *
 * Theming: the preference cookies are read on the server, so data-theme is
 * already correct in the very first HTML the browser receives. There is no
 * flash of the wrong theme. ThemeSync then handles the one case the server
 * cannot know about — the OS setting, when the preference is "system".
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ThemeSync from "@/components/ThemeSync";
import {
  THEME_COOKIE,
  TEXT_SIZE_COOKIE,
  normaliseTheme,
  normaliseTextSize,
} from "@/lib/preferences";

export const metadata: Metadata = {
  title: "Phoneme Activity Builder",
  description:
    "Build phoneme-based Wordle and Word Search activities for Speech Pathology teaching.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = normaliseTheme(cookieStore.get(THEME_COOKIE)?.value);
  const textSize = normaliseTextSize(cookieStore.get(TEXT_SIZE_COOKIE)?.value);

  // "system" cannot be resolved on the server, so fall back to light and let
  // the inline script below correct it before the first paint.
  const initialTheme = theme === "system" ? "light" : theme;

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      data-text-size={textSize}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before paint. Only does anything when the stored preference
            is "system" — it reads the OS setting and corrects the attribute
            so the page never flashes the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var v=m?decodeURIComponent(m[1]):"system";if(v==="system"){var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <ThemeSync />
        <Header />
        <NavBar />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
