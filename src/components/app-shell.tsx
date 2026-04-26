"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Compass, LayoutGrid, LogOut, Moon, Settings2, Sun } from "lucide-react";

import { FeatureTour } from "@/components/feature-tour";
import { PWAInstallBanner } from "@/components/pwa-install-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { mobileSections } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  householdName?: string;
  currentHouseholdId?: string;
};

const navIcons = {
  "/app": LayoutGrid,
  "/app/planifier": CalendarDays,
  "/app/settings": Settings2,
} as const;

const sectionMeta = {
  "/app": {
    title: "Aujourd'hui",
    description: "Ce qu'il faut faire maintenant, sans détour.",
  },
  "/app/planifier": {
    title: "Planifier",
    description: "Calendrier, routines et organisation du futur.",
  },
  "/app/settings": {
    title: "Réglages",
    description: "Tout ce qui organise le foyer sans encombrer le quotidien.",
  },
} as const;

/** Main 3 tabs visible on mobile bottom bar */
const mobileMainTabs = [
  { href: "/app" as const, label: "Aujourd'hui" },
  { href: "/app/planifier" as const, label: "Planifier" },
  { href: "/app/settings" as const, label: "Réglages" },
];


function isActivePath(pathname: string, href: string) {
  if (href === "/app/planifier") {
    return (
      pathname === "/app/planifier" ||
      pathname.startsWith("/app/calendar") ||
      pathname.startsWith("/app/my-tasks")
    );
  }
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeIconButton() {
  const { theme, setTheme } = useTheme();
  const next = { light: "dark", dark: "system", system: "light" } as const;
  const Icon = theme === "dark" ? Moon : Sun;
  return (
    <button
      aria-label={`Thème : ${theme === "light" ? "clair" : theme === "dark" ? "sombre" : "automatique"}`}
      className="btn-secondary p-2"
      onClick={() => setTheme(next[theme])}
      type="button"
    >
      <Icon className="size-4" />
    </button>
  );
}

export function AppShell({ children, householdName, currentHouseholdId }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const householdIdFromUrl = searchParams.get("household");
  const activeHouseholdId = currentHouseholdId ?? householdIdFromUrl;
  const suffix = activeHouseholdId ? `?household=${activeHouseholdId}` : "";
  const [tourOpen, setTourOpen] = useState(false);

  const activeSection =
    mobileSections.find((item) => isActivePath(pathname, item.href)) ?? mobileSections[0];
  const activeMeta = sectionMeta[activeSection.href as keyof typeof sectionMeta];

  useEffect(() => {
    if (searchParams.get("tour") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTourOpen(true);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem("mm.tour.v1.completed");
      const dismissed = window.sessionStorage.getItem("mm.tour.v1.dismissed");
      if (!seen && !dismissed && pathname === "/app") {
        setTourOpen(true);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [pathname, searchParams]);

  function closeTour() {
    setTourOpen(false);
    try {
      window.sessionStorage.setItem("mm.tour.v1.dismissed", "1");
    } catch {
      // no-op
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row lg:gap-6 lg:p-6">
      {/* Sidebar for Desktop */}
      <nav className="hidden lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:w-64 lg:flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          <div className="app-surface glow-card interactive-surface rounded-[2rem] p-6">
            <p className="section-kicker">MakeMenage</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">{householdName ?? "Votre foyer"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">
              Une base simple pour agir aujourd&apos;hui et planifier quand il le faut.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            {mobileSections.map((item) => {
              const href = `${item.href}${suffix}`;
              const active = isActivePath(pathname, item.href);
              const Icon = navIcons[item.href as keyof typeof navIcons];
              const meta = sectionMeta[item.href as keyof typeof sectionMeta];

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "interactive-surface flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-[var(--coral-500)] text-white shadow-[0_14px_28px_rgba(216,100,61,0.18)] scale-[1.02]"
                      : "text-[var(--ink-700)] hover:bg-white hover:text-[var(--ink-950)] hover:shadow-sm"
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <div className="min-w-0">
                    <span>{item.label}</span>
                    <p className={cn("truncate text-[0.72rem] font-medium opacity-80", active ? "text-white/88" : "text-[var(--ink-500)]")}>
                      {meta.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-auto space-y-3 pt-6">
          <button
            className="interactive-surface flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--ink-700)] hover:bg-white hover:text-[var(--ink-950)] hover:shadow-sm"
            onClick={() => setTourOpen(true)}
            type="button"
          >
            <Compass className="size-5 shrink-0 text-[var(--coral-500)]" />
            <div className="min-w-0 text-left">
              <span className="block">Découvrir</span>
              <span className="truncate text-[0.72rem] font-medium text-[var(--ink-500)]">
                Visite guidée des panneaux
              </span>
            </div>
          </button>
          <ThemeToggle />
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
      <div className="flex flex-1 min-w-0 flex-col px-3 pb-[8rem] pt-3 sm:px-5 lg:px-0 lg:pb-0 lg:pt-0">
        {pathname !== "/app" && (
          <header className="app-surface glow-card sticky top-3 z-20 mb-4 rounded-[1.8rem] px-4 py-3 sm:py-4 sm:px-5 lg:static lg:top-0 lg:mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="section-kicker lg:hidden">MakeMenage</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 lg:mt-0">
                  <h1 className="display-title text-xl leading-tight sm:text-3xl">
                    {activeMeta.title}
                  </h1>
                  <span className="stat-pill px-2.5 py-0.5 text-[0.65rem] font-medium text-[var(--ink-700)] lg:hidden">
                    {householdName ?? "Votre foyer"}
                  </span>
                </div>
                <p className="mt-1 hidden text-sm text-[var(--ink-700)] sm:block">
                  {activeMeta.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 lg:hidden">
                <button
                  aria-label="Découvrir l'application"
                  className="btn-secondary p-2"
                  onClick={() => setTourOpen(true)}
                  type="button"
                >
                  <Compass className="size-4" />
                </button>
                <ThemeIconButton />
                <form action="/api/auth/logout" method="post">
                  <button
                    className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm"
                    type="submit"
                  >
                    <LogOut className="size-4" />
                    <span className="hidden sm:inline">Déconnexion</span>
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1">{children}</main>

        <PWAInstallBanner />

        {/* Mobile Navigation — 3 main tabs */}
        <nav
          className="app-surface fixed inset-x-3 bottom-3 z-30 rounded-2xl px-1.5 py-1.5 lg:hidden"
          style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="grid grid-cols-3 gap-1">
            {mobileMainTabs.map((item) => {
              const href = `${item.href}${suffix}`;
              const active = isActivePath(pathname, item.href);
              const Icon = navIcons[item.href];

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  key={item.href}
                  className={cn(
                    "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center text-[0.65rem] font-semibold transition-all",
                    active
                      ? "bg-[var(--coral-500)] text-white shadow-[0_8px_20px_rgba(216,100,61,0.25)]"
                      : "text-[var(--ink-600)] active:bg-black/[0.04]",
                  )}
                  href={href}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <FeatureTour open={tourOpen} onClose={closeTour} />
    </div>
  );
}
