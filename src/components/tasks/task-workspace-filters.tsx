"use client";

import { AlertCircle, Rocket } from "lucide-react";
import { TaskCreationWizard } from "@/components/tasks/task-creation-wizard";
import { cn } from "@/lib/utils";

type TaskWorkspaceFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  roomFilter: string;
  setRoomFilter: (value: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (value: string) => void;
  overdueOnly: boolean;
  setOverdueOnly: (value: boolean | ((prev: boolean) => boolean)) => void;
  filterType: "active" | "history";
  setFilterType: (value: "active" | "history") => void;
  scope: "mine" | "household";
  setScope: (value: "mine" | "household") => void;
  rooms: string[];
  members: { id: string; displayName: string }[];
  currentMemberId?: string | null;
  activeRunningSession: boolean;
  setShowOptimizedPicker: (value: boolean) => void;
  householdId: string;
  filteredCount: number;
};

export function TaskWorkspaceFilters({
  search,
  setSearch,
  roomFilter,
  setRoomFilter,
  assigneeFilter,
  setAssigneeFilter,
  overdueOnly,
  setOverdueOnly,
  filterType,
  setFilterType,
  scope,
  setScope,
  rooms,
  members,
  currentMemberId,
  activeRunningSession,
  setShowOptimizedPicker,
  householdId,
  filteredCount,
}: TaskWorkspaceFiltersProps) {
  return (
    <>
      <section className="app-surface flex flex-col gap-4 rounded-[2rem] p-4 sm:p-5">
        <div className="relative">
          <input
            className="field h-11 w-full px-4 text-sm"
            onChange={(event) => {
              setSearch(event.currentTarget.value);
            }}
            placeholder="Rechercher une tâche, pièce..."
            type="search"
            value={search}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="field h-11 min-w-[140px] flex-1 px-3 text-sm font-semibold sm:flex-none"
            onChange={(event) => {
              setRoomFilter(event.currentTarget.value);
            }}
            value={roomFilter}
          >
            <option value="all">Toutes les pièces</option>
            {rooms.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>

          {scope === "household" && members.length > 1 && (
            <select
              className="field h-11 min-w-[140px] flex-1 px-3 text-sm font-semibold sm:flex-none"
              onChange={(event) => {
                setAssigneeFilter(event.currentTarget.value);
              }}
              value={assigneeFilter}
            >
              <option value="all">Tout le monde</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          )}

          {(roomFilter !== "all" || (scope === "household" && assigneeFilter !== "all") || search || overdueOnly) && (
            <button 
              onClick={() => {
                setRoomFilter("all");
                setAssigneeFilter("all");
                setSearch("");
                setOverdueOnly(false);
              }}
              className="ml-auto text-[0.65rem] font-bold uppercase tracking-wider text-coral-600 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </section>

      <section className="app-surface rounded-[2rem] p-5 sm:p-6 pb-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="display-title text-3xl">
              {search ? "Tâches correspondantes" : "Tâches à venir"}
            </h3>
            <div aria-live="polite" className="mt-1 flex items-center gap-1.5 rounded-full border border-line bg-glass-bg px-2.5 py-1 text-[11px] font-bold text-ink-500">
              <span className="size-1.5 rounded-full bg-coral-500" />
              {filteredCount}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {currentMemberId && (
              <button
                onClick={() => setScope(scope === "mine" ? "household" : "mine")}
                className="btn-quiet flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
                type="button"
              >
                <div className={cn("size-2 rounded-full", scope === "mine" ? "bg-coral-500" : "bg-[var(--ink-300)]")} />
                {scope === "mine" ? "Tout le foyer" : "Mes tâches"}
              </button>
            )}

            <button
              onClick={() => setFilterType(filterType === "active" ? "history" : "active")}
              className="btn-quiet flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
              type="button"
            >
              <div className={cn("size-2 rounded-full", filterType === "active" ? "bg-leaf-500" : "bg-[var(--ink-300)]")} />
              {filterType === "active" ? "Historique" : "À faire"}
            </button>

            <button
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                overdueOnly
                  ? "border-[var(--status-overdue-border)] bg-[var(--status-overdue-surface)] text-[var(--status-overdue-accent)] shadow-sm"
                  : "btn-quiet text-ink-500"
              )}
              onClick={() => {
                setOverdueOnly((prev) => !prev);
              }}
              type="button"
            >
              <AlertCircle className="size-3.5" />
              Retards
            </button>
            
            {!activeRunningSession && (
              <>
                <button
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                  onClick={() => setShowOptimizedPicker(true)}
                  type="button"
                >
                  <Rocket className="size-4" />
                  Optimiser
                </button>
                <TaskCreationWizard 
                  compact 
                  householdId={householdId} 
                  members={members} 
                />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
