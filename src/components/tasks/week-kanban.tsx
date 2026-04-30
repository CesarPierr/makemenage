import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, CheckCircle2, SkipForward, Circle } from "lucide-react";

type KanbanOccurrence = {
  id: string;
  scheduledDate: Date | string;
  status: string;
  taskTemplate: { title: string; color: string; estimatedMinutes: number; room?: string | null };
  assignedMember: { displayName: string; color: string } | null;
};

type WeekKanbanProps = {
  occurrences: KanbanOccurrence[];
  currentMemberId?: string | null;
};

type Column = {
  id: string;
  label: string;
  accent: string;
  surface: string;
  icon: typeof CheckCircle2;
  statuses: string[];
};

const COLUMNS: Column[] = [
  {
    id: "todo",
    label: "À faire",
    accent: "var(--ink-700)",
    surface: "rgba(30,31,34,0.05)",
    icon: Circle,
    statuses: ["planned", "due"],
  },
  {
    id: "overdue",
    label: "En retard",
    accent: "var(--coral-600)",
    surface: "rgba(216,100,61,0.06)",
    icon: AlertCircle,
    statuses: ["overdue"],
  },
  {
    id: "done",
    label: "Fait",
    accent: "var(--leaf-600)",
    surface: "rgba(56,115,93,0.06)",
    icon: CheckCircle2,
    statuses: ["completed"],
  },
  {
    id: "skipped",
    label: "Sauté",
    accent: "var(--ink-500)",
    surface: "rgba(30,31,34,0.04)",
    icon: SkipForward,
    statuses: ["skipped", "rescheduled"],
  },
];

export function WeekKanban({ occurrences }: WeekKanbanProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <p className="section-kicker">Semaine en cours</p>
          <h3 className="display-title mt-1 text-2xl">Ma semaine</h3>
        </div>
        <span className="accent-pill text-[0.65rem]">
          <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
          {occurrences.length} tâche{occurrences.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Desktop: 4-column Kanban grid */}
      <div className="hidden lg:grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const items = occurrences.filter((o) => col.statuses.includes(o.status));
          const Icon = col.icon;
          return (
            <div key={col.id} className="app-surface rounded-[1.8rem] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="size-4" style={{ color: col.accent }} aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: col.accent }}>
                  {col.label}
                </p>
                <span className="ml-auto text-xs font-semibold text-ink-500">
                  {items.length}
                </span>
              </div>
              <ul aria-label={`Tâches ${col.label}`} className="space-y-2">
                {items.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-ink-500">
                    Aucune
                  </li>
                ) : (
                  items.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-xl border border-line px-3 py-2.5 text-xs"
                      style={{ background: col.surface }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-0.5 size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: o.taskTemplate.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-tight truncate">{o.taskTemplate.title}</p>
                          <div className="mt-1 flex flex-wrap gap-1 text-[0.6rem] text-ink-500">
                            {o.taskTemplate.room ? <span>{o.taskTemplate.room}</span> : null}
                            <span>{o.taskTemplate.estimatedMinutes} min</span>
                            <span>{format(new Date(o.scheduledDate), "EEE d", { locale: fr })}</span>
                          </div>
                          {o.assignedMember ? (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="size-1.5 rounded-full" style={{ backgroundColor: o.assignedMember.color }} />
                              <span className="text-[0.6rem] text-ink-500">{o.assignedMember.displayName}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Mobile: compact status-grouped list */}
      <div className="lg:hidden space-y-2">
        {COLUMNS.filter((col) => occurrences.some((o) => col.statuses.includes(o.status))).map((col) => {
          const items = occurrences.filter((o) => col.statuses.includes(o.status));
          const Icon = col.icon;
          return (
            <div key={col.id} className="app-surface rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="size-3.5" style={{ color: col.accent }} aria-hidden="true" />
                <p className="text-[0.7rem] font-bold uppercase tracking-wider" style={{ color: col.accent }}>
                  {col.label} · {items.length}
                </p>
              </div>
              <ul className="space-y-1.5">
                {items.slice(0, 4).map((o) => (
                  <li key={o.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs" style={{ background: col.surface }}>
                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: o.taskTemplate.color }} />
                    <span className="font-medium truncate flex-1">{o.taskTemplate.title}</span>
                    <span className="shrink-0 text-[0.6rem] text-ink-500">
                      {format(new Date(o.scheduledDate), "EEE", { locale: fr })}
                    </span>
                  </li>
                ))}
                {items.length > 4 ? (
                  <li className="text-center text-[0.6rem] text-ink-500 py-1">+{items.length - 4} de plus</li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
