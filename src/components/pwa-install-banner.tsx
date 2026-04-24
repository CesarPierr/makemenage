"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("pwa-banner-dismissed") === "1";
  });
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches;
  });

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  }

  function handleDismiss() {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setIsDismissed(true);
  }

  if (!installPrompt || isDismissed || isInstalled) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-[5rem] left-3 right-3 z-40 rounded-2xl border border-[var(--line)] bg-white/95 shadow-xl backdrop-blur-sm lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(216,100,61,0.12)] text-[var(--coral-600)]">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--ink-950)]">Installer l&apos;application</p>
          <p className="text-xs text-[var(--ink-500)]">Accès rapide depuis l&apos;écran d&apos;accueil</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="btn-primary rounded-xl px-3 py-1.5 text-xs font-bold"
            onClick={handleInstall}
            type="button"
          >
            Installer
          </button>
          <button
            className="flex size-7 items-center justify-center rounded-full text-[var(--ink-400)] hover:bg-black/[0.06] transition-colors"
            onClick={handleDismiss}
            type="button"
            aria-label="Fermer la bannière d'installation"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
