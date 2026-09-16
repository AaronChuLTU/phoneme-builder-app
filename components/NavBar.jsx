"use client";

/**
 * NavBar
 *
 * Two tiers of navigation, split by how often each page is used:
 *
 *   PRIMARY_LINKS   the four builder/generator pages — shown inline on wide
 *                    screens, and always included in the hamburger too.
 *   SECONDARY_LINKS  Manage, About, Settings — configuration and reference
 *                    pages a teacher visits far less often. Hamburger only.
 *
 * The hamburger's dropdown always lists every page (primary + secondary), so
 * it doubles as a complete site map — useful on its own even when the
 * primary row is already visible, and it is the ONLY way to reach the
 * secondary pages on desktop, which is what makes it more than a mobile
 * convenience.
 *
 * ALL_LINKS is built by concatenating the two arrays rather than declared
 * separately, so the hamburger can never drift out of sync with what the
 * primary/secondary split actually contains — one source of truth for
 * "every page that exists", the same principle PageHeader uses for spacing.
 *
 * Accessibility
 *   - aria-current="page" marks the active link for screen readers
 *   - aria-expanded / aria-controls describe the hamburger's open state
 *   - Escape closes the menu and returns focus to the button
 *   - clicking outside closes it, which mouse users expect
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_LINKS = [
  { href: "/", label: "Home" },
  { href: "/wordle", label: "Wordle" },
  { href: "/word-search", label: "Word Search" },
  { href: "/manage/activities", label: "Activities" },
];

const SECONDARY_LINKS = [
  { href: "/manage", label: "Manage" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...SECONDARY_LINKS];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on navigation, otherwise the menu stays open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes and returns focus to the button, so keyboard users are not
  // stranded at the end of the document.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Click outside closes the menu.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event) {
      if (
        !menuRef.current?.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function linkClasses(href) {
    const isActive = pathname === href;
    return [
      "block rounded px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
        : "text-[var(--text)] hover:bg-[var(--accent-soft)]",
    ].join(" ");
  }

  return (
    <nav
      aria-label="Main navigation"
      className="relative border-b border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between gap-2 py-2">
          {/* Primary links only — hidden on narrow screens */}
          <ul className="hidden gap-1 sm:flex">
            {PRIMARY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={linkClasses(link.href)}
                  aria-current={pathname === link.href ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* On narrow screens the inline list is gone, so label the bar */}
          <span className="text-sm font-medium sm:hidden">Menu</span>

          {/* Hamburger — always present. On wide screens it is the only way
              to reach Manage, About and Settings. */}
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
            aria-expanded={open}
            aria-controls="compact-menu"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            className="rounded border border-[var(--border)] p-2 text-[var(--text)] hover:bg-[var(--accent-soft)]"
          >
            {/* Drawn as one SVG rather than three stacked divs: at 2px
                thick, flex layout rounds each bar to the nearest physical
                pixel independently, so they could render at very slightly
                different weights. A single SVG's strokes do not have that
                problem. */}
            <svg
              aria-hidden="true"
              width="20"
              height="16"
              viewBox="0 0 20 16"
              fill="none"
            >
              <line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="2" />
              <line x1="0" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="2" />
              <line x1="0" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>

        {/* Dropdown panel — lists every page, primary and secondary, so it
            works as a complete site map regardless of what is inline. */}
        {open && (
          <div
            ref={menuRef}
            id="compact-menu"
            className="pb-3 sm:absolute sm:right-4 sm:top-full sm:z-30 sm:w-56 sm:rounded-b-lg sm:border sm:border-t-0 sm:border-[var(--border)] sm:bg-[var(--surface)] sm:p-2 sm:pb-2 sm:shadow-lg"
          >
            <ul className="flex flex-col gap-1">
              {ALL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={linkClasses(link.href)}
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
