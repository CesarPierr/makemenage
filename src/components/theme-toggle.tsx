"use client";

import { Moon, Sun, Monitor } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, icon: Sun, label: "Clair" },
    { value: "dark" as const, icon: Moon, label: "Sombre" },
    { value: "system" as const, icon: Monitor, label: "Auto" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-[var(--line)] bg-white/30 p-1" role="group" aria-label="Thème de l'interface">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          aria-pressed={theme === value}
          key={value}
          onClick={() => setTheme(value)}
          type="button"
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
            theme === value
              ? "bg-[var(--coral-500)] text-white shadow-sm"
              : "text-[var(--ink-700)] hover:bg-white/60",
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
