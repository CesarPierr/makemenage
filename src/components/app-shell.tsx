"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { CalendarDays, History, LayoutGrid, ListTodo, LogOut, Settings2 } from "lucide-react";

import { mobileSections } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  householdName?: string;
  currentHouseholdId?: string;
};

export function AppShell({ children, householdName, currentHouseholdId }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const householdIdFromUrl = searchParams.get("household");
  const activeHouseholdId = currentHouseholdId ?? householdIdFromUrl;
  const suffix = activeHouseholdId ? `?household=${activeHouseholdId}` : "";
  const navIcons = {
    "/app": LayoutGrid,
    "/app/my-tasks": ListTodo,
    "/app/calendar": CalendarDays,
    "/app/history": History,
    "/app/settings": Settings2,
  } as const;
  const sectionMeta = {
    "/app": {
      title: "Accueil",
    },
    "/app/my-tasks": {
      title: "Tâches",
    },
    "/app/calendar": {
      title: "Calendrier",
    },
    "/app/history": {
      title: "Historique",
    },
    "/app/settings": {
      title: "Réglages",
    },
  } as const;
  const activeSection =
    mobileSections.find((item) => item.href === pathname) ?? mobileSections[0];
  const activeMeta = sectionMeta[activeSection.href as keyof typeof sectionMeta];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row lg:gap-6 lg:p-6">
      {/* Sidebar for Desktop */}
      <nav className="hidden lg:flex lg:w-64 lg:flex-col lg:gap-4">
        <div className="app-surface glow-card rounded-[2rem] p-6 mb-4">
          <p className="section-kicker">MakeMenage</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{householdName ?? "Votre foyer"}</h2>
        </div>
        
        <div className="flex flex-col gap-2">
          {mobileSections.map((item) => {
            const href = `${item.href}${suffix}`;
            const active = pathname === item.href;
            const Icon = navIcons[item.href as keyof typeof navIcons];

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all",
                  active
                    ? "bg-[var(--coral-500)] text-white shadow-[0_14px_28px_rgba(216,100,61,0.18)] scale-[1.02]"
                    : "text-[var(--ink-700)] hover:bg-white hover:text-[var(--ink-950)] hover:shadow-sm"
                )}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto pt-6">
          <form action="/api/auth/logout" method="post">
            <button
              className="btn-quiet flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              type="submit"
            >
              <LogOut className="size-5" />
              Déconnexion
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col px-3 pb-[7.5rem] pt-3 sm:px-5 lg:px-0 lg:pb-0 lg:pt-0">
        <header className="app-surface glow-card sticky top-3 z-20 mb-4 rounded-[1.8rem] px-4 py-4 sm:px-5 lg:static lg:top-0 lg:mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="section-kicker lg:hidden">MakeMenage</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-0">
                <h1 className="display-title text-2xl leading-tight sm:text-3xl">
                  {activeMeta.title}
                </h1>
                <span className="stat-pill px-3 py-1 text-xs font-medium text-[var(--ink-700)] lg:hidden">
                  {householdName ?? "Votre foyer"}
                </span>
              </div>
            </div>
            <form action="/api/auth/logout" method="post" className="shrink-0 lg:hidden">
              <button
                className="btn-secondary inline-flex items-center gap-2 px-3.5 py-2 text-sm"
                type="submit"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        {/* Mobile Navigation (Floating Bottom) */}
        <nav
          className="app-surface fixed inset-x-3 bottom-3 z-30 rounded-[1.8rem] px-2 py-2.5 lg:hidden"
          style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="grid grid-cols-5 gap-1">
            {mobileSections.map((item) => {
              const href = `${item.href}${suffix}`;
              const active = pathname === item.href;
              const Icon = navIcons[item.href as keyof typeof navIcons];

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  key={item.href}
                  className={cn(
                    "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1.5 py-2 text-center text-[0.68rem] font-medium transition-all",
                    active
                      ? "bg-[var(--coral-500)] text-white shadow-[0_14px_28px_rgba(216,100,61,0.25)]"
                      : "text-[var(--ink-700)] hover:bg-white/70",
                  )}
                  href={href}
                >
                  <Icon className="size-[1.05rem] shrink-0" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
