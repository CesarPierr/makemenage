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
      title: "Vue d'ensemble",
    },
    "/app/my-tasks": {
      title: "Mes tâches",
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
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pb-[7.5rem] pt-3 sm:px-5 lg:px-8">
      <header className="app-surface glow-card sticky top-3 z-20 mb-4 rounded-[1.8rem] px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="section-kicker">MakeMenage</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="display-title text-2xl leading-tight sm:text-3xl">
                {activeMeta.title}
              </h1>
              <span className="stat-pill px-3 py-1 text-xs font-medium text-[var(--ink-700)]">
                {householdName ?? "Votre foyer"}
              </span>
            </div>
          </div>
          <form action="/api/auth/logout" method="post" className="shrink-0">
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

      <div className="flex-1">{children}</div>

      <nav
        className="app-surface fixed inset-x-3 bottom-3 z-30 rounded-[1.8rem] px-2 py-2.5 lg:static lg:mt-6 lg:flex lg:justify-center"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="grid grid-cols-5 gap-1 lg:flex lg:gap-2">
          {mobileSections.map((item) => {
            const href = `${item.href}${suffix}`;
            const active = pathname === item.href;
            const Icon = navIcons[item.href as keyof typeof navIcons];

            return (
              <Link
                aria-current={active ? "page" : undefined}
                key={item.href}
                className={cn(
                  "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1.5 py-2 text-center text-[0.68rem] font-medium transition-all sm:text-sm lg:min-h-0 lg:flex-row lg:px-4",
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
  );
}
