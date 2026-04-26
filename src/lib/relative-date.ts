import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Render a date relative to "today" using compact, mobile-friendly French copy:
 * - "aujourd'hui", "demain", "après-demain", "hier", "avant-hier"
 * - "dans 4 j" / "dans 1 sem 2 j" / "dans 3 sem" up to ~30 days ahead
 * - "il y a 4 j" / "il y a 1 sem 2 j" up to ~30 days behind
 * - Beyond that, falls back to absolute date "5 mai" or "5 mai 2027" (prev year)
 *
 * Use `style: "long"` to expand "dans 1 sem 2 j" into "dans 1 semaine 2 jours" and so on.
 */
export type RelativeDateStyle = "short" | "long";

export function formatRelative(date: Date | string, options?: { now?: Date; style?: RelativeDateStyle }): string {
  const target = startOfDay(date instanceof Date ? date : new Date(date));
  const now = startOfDay(options?.now ?? new Date());
  const style = options?.style ?? "short";
  const diff = differenceInCalendarDays(target, now);

  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "demain";
  if (diff === -1) return "hier";
  if (diff === 2) return "après-demain";
  if (diff === -2) return "avant-hier";

  const abs = Math.abs(diff);

  if (abs <= 30) {
    const weeks = Math.floor(abs / 7);
    const days = abs % 7;
    let body: string;

    if (style === "long") {
      const parts: string[] = [];
      if (weeks > 0) parts.push(`${weeks} semaine${weeks > 1 ? "s" : ""}`);
      if (days > 0 || weeks === 0) parts.push(`${days} jour${days > 1 ? "s" : ""}`);
      body = parts.join(" ");
    } else {
      // Short: "1 sem 2 j", "3 sem", "5 j"
      const parts: string[] = [];
      if (weeks > 0) parts.push(`${weeks} sem`);
      if (days > 0 || weeks === 0) parts.push(`${days} j`);
      body = parts.join(" ");
    }

    return diff > 0 ? `dans ${body}` : `il y a ${body}`;
  }

  // Beyond ~30 days, show absolute "5 mai" — or "5 mai 2027" if not in current year
  const sameYear = target.getFullYear() === now.getFullYear();
  return format(target, sameYear ? "d MMM" : "d MMM yyyy", { locale: fr });
}

/**
 * Variant that returns a tone hint — useful for colour decisions in the UI.
 */
export function classifyRelative(date: Date | string, now?: Date) {
  const target = startOfDay(date instanceof Date ? date : new Date(date));
  const today = startOfDay(now ?? new Date());
  const diff = differenceInCalendarDays(target, today);

  if (diff < 0) {
    if (diff <= -8) return { kind: "very-late", daysLate: -diff };
    if (diff <= -4) return { kind: "late", daysLate: -diff };
    return { kind: "slightly-late", daysLate: -diff };
  }
  if (diff === 0) return { kind: "today" } as const;
  if (diff <= 2) return { kind: "soon", daysAhead: diff };
  return { kind: "future", daysAhead: diff };
}
