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

    // Smooth path generation (Cubic Bezier)
    let path = "";
    if (xy.length > 0) {
      path = `M ${xy[0].x.toFixed(2)} ${xy[0].y.toFixed(2)}`;
      for (let i = 0; i < xy.length - 1; i++) {
        const p0 = xy[i];
        const p1 = xy[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
      }
    }

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
    <div className="space-y-2">
      <div className="rounded-xl bg-black/[0.01] p-1">
        <svg
          viewBox={`0 0 ${data.W} ${data.H}`}
          preserveAspectRatio="none"
          className="block w-full overflow-visible"
          style={{ height }}
          role="img"
          aria-label={`Évolution du solde de ${formatCurrency(first.balance)} à ${formatCurrency(last.balance)}`}
        >
          <defs>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {data.zeroY !== null ? (
            <line
              x1="0"
              x2={data.W}
              y1={data.zeroY}
              y2={data.zeroY}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="0.2"
              strokeDasharray="1,1"
            />
          ) : null}

          <path d={data.fillPath} fill={`url(#grad-${color.replace("#", "")})`} />
          <path 
            d={data.path} 
            fill="none" 
            stroke={color} 
            strokeWidth="1.5" 
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke" 
          />
          
          {/* Subtle dots for each entry */}
          {data.points.map((p, i) => (
            <circle 
              key={i} 
              cx={p.x} 
              cy={p.y} 
              r="0.8" 
              fill={color} 
              className="opacity-40" 
            />
          ))}
          
          {/* Final strong dot */}
          <circle cx={last.x} cy={last.y} r="1.5" fill={color} className="shadow-sm" />
        </svg>
      </div>
      
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <span className="text-[0.6rem] uppercase tracking-tighter text-[var(--ink-400)] font-bold">Départ</span>
          <span className="text-[0.65rem] font-medium text-[var(--ink-600)]">{format(first.date, "d MMM", { locale: fr })}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[0.6rem] uppercase tracking-tighter text-[var(--ink-400)] font-bold">Amplitude</span>
          <span className="text-[0.65rem] font-bold text-[var(--ink-900)]">{formatCurrency(data.max - data.min)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[0.6rem] uppercase tracking-tighter text-[var(--ink-400)] font-bold">Aujourd&apos;hui</span>
          <span className="text-[0.65rem] font-medium text-[var(--ink-600)]">{format(last.date, "d MMM", { locale: fr })}</span>
        </div>
      </div>
    </div>
  );
}
