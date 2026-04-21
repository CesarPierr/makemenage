"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mobileSections } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  householdName?: string;
  currentHouseholdId?: string;
};

export function AppShell({ children, householdName, currentHouseholdId }: AppShellProps) {
  const pathname = usePathname();
  const suffix = currentHouseholdId ? `?household=${currentHouseholdId}` : "";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pb-28 pt-3 sm:px-5 lg:px-8">
      <header className="app-surface sticky top-3 z-20 mb-4 flex items-center justify-between rounded-[1.8rem] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--leaf-600)]">MakeMenage</p>
          <h1 className="display-title text-xl sm:text-2xl">{householdName ?? "Votre foyer"}</h1>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn-secondary px-4 py-2 text-sm" type="submit">
            Déconnexion
          </button>
        </form>
      </header>

      <div className="flex-1">{children}</div>

      <nav className="app-surface fixed inset-x-3 bottom-3 z-30 rounded-[1.7rem] px-2 py-2 lg:static lg:mt-6 lg:flex lg:justify-center">
        <div className="grid grid-cols-5 gap-1 lg:flex lg:gap-2">
          {mobileSections.map((item) => {
            const href = `${item.href}${suffix}`;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                className={cn(
                  "rounded-[1.2rem] px-3 py-2 text-center text-xs font-medium transition-colors sm:text-sm",
                  active
                    ? "bg-[var(--coral-500)] text-white"
                    : "text-[var(--ink-700)] hover:bg-white/70",
                )}
                href={href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
