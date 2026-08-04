"use client";

/**
 * NavBar
 *
 * "use client" is required because this component uses useState and
 * usePathname. Next.js renders components on the server by default; anything
 * that needs interactivity or browser APIs must opt in with this directive.
 *
 * Responsive behaviour:
 *   - wide screens: all links shown inline
 *   - narrow screens: links collapse into a hamburger menu
 *
 * Accessibility notes worth mentioning in your video:
 *   - aria-current="page" tells a screen reader which link is the current page
 *   - aria-expanded / aria-controls describe the hamburger's open state
 *   - Escape closes the menu, which keyboard users expect
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/wordle", label: "Wordle" },
  { href: "/word-search", label: "Word Search" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef(null);

  // Close the menu whenever the route changes, otherwise it stays open
  // over the new page after a link is tapped.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes the menu.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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
      className="border-b border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between py-2">
          {/* Inline links — hidden below the sm breakpoint */}
          <ul className="hidden gap-1 sm:flex">
            {LINKS.map((link) => (
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

          {/* Placeholder keeps the hamburger right-aligned on small screens */}
          <span className="text-sm font-medium sm:hidden">Menu</span>

          {/* Hamburger — only shown below the sm breakpoint */}
          <button
            type="button"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            className="rounded border border-[var(--border)] p-2 sm:hidden"
          >
            {/* Three bars, drawn with spans so no icon library is needed */}
            <span className="sr-only">Toggle navigation</span>
            <span aria-hidden="true" className="flex w-5 flex-col gap-1">
              <span className="h-0.5 w-full bg-[var(--text)]" />
              <span className="h-0.5 w-full bg-[var(--text)]" />
              <span className="h-0.5 w-full bg-[var(--text)]" />
            </span>
          </button>
        </div>

        {/* Collapsible panel */}
        {open && (
          <ul
            id="mobile-menu"
            ref={panelRef}
            className="flex flex-col gap-1 pb-3 sm:hidden"
          >
            {LINKS.map((link) => (
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
        )}
      </div>
    </nav>
  );
}
