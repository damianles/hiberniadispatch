"use client";

import Link from "next/link";
import { useState } from "react";

export type NavItem = { href: string; label: string };

export function MobileNav({
  items,
  userLabel,
  signOutAction,
}: {
  items: NavItem[];
  userLabel: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center border border-line text-sage-dark transition hover:border-sage"
      >
        {open ? (
          <span className="text-xl leading-none" aria-hidden>
            ×
          </span>
        ) : (
          <span className="flex flex-col gap-1.5" aria-hidden>
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        )}
      </button>

      {open ? (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full border-b border-line bg-white/95 shadow-sm backdrop-blur-sm"
        >
          <div className="mx-auto max-w-6xl px-4 py-3">
            <p className="mb-2 text-xs text-ink/50">{userLabel}</p>
            <nav className="flex flex-col">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center border-b border-line/50 text-sm text-ink/80 last:border-0 hover:text-sage-dark"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <form action={signOutAction} className="mt-3">
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center border border-line text-sm text-ink/80 transition hover:border-burgundy hover:text-burgundy"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
