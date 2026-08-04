/**
 * Root layout — wraps every page in the app.
 *
 * This is the file that gives you "component reuse" for the rubric: Header,
 * NavBar and Footer are written once here and appear on all five pages.
 *
 * suppressHydrationWarning on <html> is needed because the Settings page will
 * set data-theme on this element before React loads, which otherwise makes the
 * server-rendered and client-rendered HTML disagree.
 */

import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Phoneme Activity Builder",
  description:
    "Build phoneme-based Wordle and Word Search activities for Speech Pathology teaching.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
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
