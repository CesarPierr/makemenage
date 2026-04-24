import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type PlanifierHubCardProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  value: string;
  detail: string;
  cta: string;
  accent: "coral" | "sky" | "leaf" | "ink";
};

const accentStyles = {
  coral: {
    iconBg: "rgba(216,100,61,0.14)",
    iconText: "var(--coral-600)",
    glow: "rgba(216,100,61,0.06)",
    cta: "text-[var(--coral-600)]",
  },
  sky: {
    iconBg: "rgba(47,109,136,0.14)",
    iconText: "var(--sky-600)",
    glow: "rgba(47,109,136,0.06)",
    cta: "text-[var(--sky-600)]",
  },
  leaf: {
    iconBg: "rgba(56,115,93,0.14)",
    iconText: "var(--leaf-600)",
    glow: "rgba(56,115,93,0.06)",
    cta: "text-[var(--leaf-600)]",
  },
  ink: {
    iconBg: "rgba(30,31,34,0.08)",
    iconText: "var(--ink-950)",
    glow: "rgba(30,31,34,0.04)",
    cta: "text-[var(--ink-950)]",
  },
} as const;

export function PlanifierHubCard({
  href,
  icon: Icon,
  label,
  description,
  value,
  detail,
  cta,
  accent,
}: PlanifierHubCardProps) {
  const styles = accentStyles[accent];

  return (
    <Link
      href={href}
      className="app-surface group relative flex min-h-[15rem] flex-col justify-between overflow-hidden rounded-[2rem] p-5 transition-all hover:-translate-y-1 hover:shadow-xl sm:p-6"
    >
      <div className="relative z-10">
        <div
          className="inline-flex rounded-2xl p-3"
          style={{ backgroundColor: styles.iconBg, color: styles.iconText }}
        >
          <Icon className="size-5" />
        </div>
        <p className="section-kicker mt-4">Planifier</p>
        <h3 className="display-title mt-2 text-2xl transition-colors group-hover:text-[var(--sky-600)]">
          {label}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">{description}</p>
      </div>

      <div className="relative z-10 mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold text-[var(--ink-950)]">{value}</p>
          <p className="mt-1 text-sm text-[var(--ink-500)]">{detail}</p>
        </div>
        <span className={`text-sm font-bold ${styles.cta}`}>{cta}</span>
      </div>

      <div
        aria-hidden="true"
        className="absolute -bottom-8 -right-8 size-32 rounded-full transition-transform group-hover:scale-150"
        style={{ backgroundColor: styles.glow }}
      />
    </Link>
  );
}
