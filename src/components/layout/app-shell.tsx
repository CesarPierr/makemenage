"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Compass, Home, LayoutGrid, LogOut, Moon, PiggyBank, Settings2, Sun } from "lucide-react";

import { FeatureTour } from "@/components/onboarding/feature-tour";
import { PWAInstallBanner } from "@/components/shared/pwa-install-banner";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useTheme } from "@/components/shared/theme-provider";
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
  "/app/epargne": PiggyBank,
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
  "/app/epargne": {
    title: "Épargne",
    description: "Vos enveloppes, vos objectifs, en un coup d'œil.",
  },
  "/app/settings": {
    title: "Réglages",
    description: "Tout ce qui organise le foyer sans encombrer le quotidien.",
  },
} as const;

/** Main tabs visible on mobile bottom bar */
const mobileMainTabs = [
  { href: "/app" as const, label: "Aujourd'hui" },
  { href: "/app/planifier" as const, label: "Planifier" },
  { href: "/app/epargne" as const, label: "Épargne" },
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

  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show if scrolling up or at top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setNavVisible(true);
      } 
      // Hide if scrolling down and past threshold
      else if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setNavVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

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
          <div className="app-surface glow-card rounded-[2rem] p-6">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-coral-500 text-white shadow-lg shadow-coral-500/20">
                <Home className="size-5" />
              </div>
              <p className="font-display text-xl font-bold tracking-tight text-ink-950">Hearthly</p>
            </div>
            <h2 className="mt-4 text-sm font-bold text-ink-950">{householdName ?? "Votre foyer"}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
              Organisez vos routines et votre budget. Partagez les responsabilités équitablement.
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
                    "relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300",
                    active
                      ? "bg-white text-ink-950 shadow-[0_12px_24px_-8px_rgba(70,48,20,0.12)] ring-1 ring-black/5 scale-[1.02]"
                      : "text-ink-700 hover:bg-white/40 hover:text-ink-950"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-coral-500 animate-in fade-in slide-in-from-left-1" />
                  )}
                  <Icon className="size-5 shrink-0" />
                  <div className="min-w-0">
                    <span>{item.label}</span>
                    <p className={cn("truncate text-[0.72rem] font-medium transition-colors", active ? "text-ink-600" : "text-ink-500")}>
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
            className="interactive-surface flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-white dark:bg-[#262830] hover:text-ink-950 hover:shadow-sm"
            onClick={() => setTourOpen(true)}
            type="button"
          >
            <Compass className="size-5 shrink-0 text-coral-500" />
            <div className="min-w-0 text-left">
              <span className="block">Découvrir</span>
              <span className="truncate text-[0.72rem] font-medium text-ink-500">
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
        {!["/app", "/app/planifier"].includes(pathname) && (
          <header className="app-surface glow-card sticky top-3 z-20 mb-4 rounded-[1.8rem] px-4 py-3 sm:py-4 sm:px-5 lg:static lg:top-0 lg:mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 lg:hidden mb-1">
                  <div className="flex size-5 items-center justify-center rounded bg-coral-500 text-white shadow-sm">
                    <Home className="size-3" />
                  </div>
                  <p className="section-kicker !tracking-normal !normal-case text-[0.65rem] font-bold">Hearthly</p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 lg:mt-0">
                  <h1 className="display-title text-xl leading-tight sm:text-3xl">
                    {activeMeta.title}
                  </h1>
                  <span className="stat-pill px-2.5 py-0.5 text-[0.65rem] font-medium text-ink-700 lg:hidden">
                    {householdName ?? "Votre foyer"}
                  </span>
                </div>
                <p className="mt-1 hidden text-sm text-ink-700 sm:block">
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
          className={cn(
            "app-surface fixed inset-x-3 bottom-3 z-30 rounded-2xl px-1.5 py-1.5 transition-all duration-300 lg:hidden",
            !navVisible && "translate-y-24 opacity-0 pointer-events-none"
          )}
          style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="grid grid-cols-4 gap-1">
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
                      ? "bg-white text-ink-950 shadow-[0_8px_20px_rgba(70,48,20,0.12)] ring-1 ring-black/5"
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
