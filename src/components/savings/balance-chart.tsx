"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { formatCurrency } from "@/lib/savings/currency";
import type { SavingsEntryView } from "@/components/savings/types";

type BalanceChartProps = {
  entries: SavingsEntryView[];
  currentBalance: number;
  color: string;
  height?: number;
};

type Point = { date: Date; balance: number };

function buildSeries(entries: SavingsEntryView[], currentBalance: number): Point[] {
  if (entries.length === 0) {
    return [{ date: new Date(), balance: currentBalance }];
  }

  // entries arrive newest-first from the API; sort ascending by occurredOn for cumulative sum
  const sorted = [...entries].sort(
    (a, b) => new Date(a.occurredOn).getTime() - new Date(b.occurredOn).getTime(),
  );

  // Compute cumulative balance after each entry. We trust currentBalance as the final value
  // and reconstruct earlier points by walking backward when needed.
  const points: Point[] = [];
  let running = 0;
  for (const e of sorted) {
    const amount = Number.parseFloat(e.amount);
    const signed = ["deposit", "transfer_in", "auto_fill"].includes(e.type)
      ? amount
      : e.type === "adjustment"
        ? amount
        : -amount;
    running += signed;
    points.push({ date: new Date(e.occurredOn), balance: Math.round(running * 100) / 100 });
  }

  // Add a final point at "today" matching currentBalance to anchor the chart.
  const last = points[points.length - 1];
  if (!last || last.balance !== currentBalance) {
    points.push({ date: new Date(), balance: currentBalance });
  }

  return points;
}

export function BalanceChart({
  entries,
  currentBalance,
  color,
  height = 100,
}: BalanceChartProps) {
  const points = useMemo(
    () => buildSeries(entries, currentBalance),
    [entries, currentBalance],
  );

  const data = useMemo(() => {
    if (points.length < 2) return null;

    const balances = points.map((p) => p.balance);
    const minRaw = Math.min(...balances, 0);
    const maxRaw = Math.max(...balances, 0);
    const span = maxRaw - minRaw || 1;
    // Add 10% padding above and below
    const min = minRaw - span * 0.1;
    const max = maxRaw + span * 0.1;
    const range = max - min || 1;

    const tStart = points[0].date.getTime();
    const tEnd = points[points.length - 1].date.getTime();
    const tSpan = tEnd - tStart || 1;

    const W = 100;
    const H = 40;
    const xy = points.map((p) => {
      const x = ((p.date.getTime() - tStart) / tSpan) * W;
      const y = H - ((p.balance - min) / range) * H;
      return { x, y, balance: p.balance, date: p.date };
    });

    const path = xy
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");

    const fillPath = `${path} L ${W} ${H} L 0 ${H} Z`;

    // y-axis position of zero line (if 0 falls inside [min, max])
    const zeroY = 0 >= min && 0 <= max ? H - ((0 - min) / range) * H : null;

    return {
      points: xy,
      path,
      fillPath,
      zeroY,
      min: minRaw,
      max: maxRaw,
      W,
      H,
    };
  }, [points]);

  if (!data) {
    return (
      <div
        className="rounded-xl bg-black/[0.02] flex items-center justify-center text-xs text-[var(--ink-500)]"
        style={{ height }}
      >
        Pas encore d&apos;historique pour tracer une évolution.
      </div>
    );
  }

  const first = data.points[0];
  const last = data.points[data.points.length - 1];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[var(--ink-500)]">
        <span>{format(first.date, "d MMM yyyy", { locale: fr })}</span>
        <span>Aujourd&apos;hui</span>
      </div>
      <div className="rounded-xl bg-black/[0.02] p-2">
        <svg
          viewBox={`0 0 ${data.W} ${data.H}`}
          preserveAspectRatio="none"
          className="block w-full"
          style={{ height }}
          role="img"
          aria-label={`Évolution du solde de ${formatCurrency(first.balance)} à ${formatCurrency(last.balance)}`}
        >
          <defs>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {data.zeroY !== null ? (
            <line
              x1="0"
              x2={data.W}
              y1={data.zeroY}
              y2={data.zeroY}
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
          ) : null}
          <path d={data.fillPath} fill={`url(#grad-${color.replace("#", "")})`} />
          <path d={data.path} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx={last.x} cy={last.y} r="1.2" fill={color} />
        </svg>
      </div>
      <div className="flex items-center justify-between text-[0.7rem] text-[var(--ink-500)]">
        <span>Min {formatCurrency(data.min)}</span>
        <span>Max {formatCurrency(data.max)}</span>
      </div>
    </div>
  );
}
