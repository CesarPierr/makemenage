"use client";

import { addDays, isSameDay, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Rocket } from "lucide-react";

import { FocusSession } from "@/components/focus-session";
import { OccurrenceCard } from "@/components/occurrence-card";
import { TaskCreationWizard } from "@/components/task-creation-wizard";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "@/components/ui/toast";
import { groupOccurrencesByRoom } from "@/lib/experience";
import {
  getEventTimeMs,
  getRunningSessionStorageKey,
  parseStoredRunningSession,
  RUNNING_SESSION_ACTIVE_STATUSES as ACTIVE_STATUSES,
  sanitizeRunningSession,
  type RunningSession,
} from "@/lib/running-session";
import { cn } from "@/lib/utils";

type WorkspaceOccurrence = {
  id: string;
  scheduledDate: Date | string;
  status: string;
  notes: string | null;
  actualMinutes: number | null;
  assignedMemberId?: string | null;
  taskTemplateId?: string;
  isManuallyModified?: boolean;
  rescheduleCount?: number;
  taskTemplate: {
    title: string;
    category: string | null;
    room?: string | null;
    icon?: string | null;
    estimatedMinutes: number;
    color: string;
    isCollective?: boolean;
  };
  assignedMember: { id: string; displayName: string; color: string } | null;
  wasCompletedAlone?: boolean | null;
  updatedAt: Date | string;
  completedAt?: Date | string | null;
};

type TaskWorkspaceClientProps = {
  householdId: string;
  currentMemberId?: string | null;
  manageable: boolean;
  members: { id: string; displayName: string }[];
  occurrences: WorkspaceOccurrence[];
  autoStartSession?: boolean;
};

export function TaskWorkspaceClient({
  householdId,
  currentMemberId,
  manageable,
  members,
  occurrences,
  autoStartSession,
}: TaskWorkspaceClientProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [scope, setScope] = useState<"mine" | "household">(currentMemberId ? "mine" : "household");
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [filterType, setFilterType] = useState<"active" | "history">("active");
  const [showOptimizedPicker, setShowOptimizedPicker] = useState(false);
  const sessionStorageKey = getRunningSessionStorageKey(householdId, currentMemberId);
  const [runningSession, setRunningSession] = useState<RunningSession | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return parseStoredRunningSession(window.localStorage.getItem(sessionStorageKey));
  });
  const [horizon, setHorizon] = useState<3 | 7 | 30>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clock, setClock] = useState(0);
  const [sessionDoneCount, setSessionDoneCount] = useState(0);
  const [sessionSkippedCount, setSessionSkippedCount] = useState(0);
  const dashboardPath = `/app?household=${householdId}`;

  const normalizedOccurrences = useMemo(
    () =>
      occurrences.map((occurrence) => ({
        ...occurrence,
        scheduledDate: new Date(occurrence.scheduledDate),
        updatedAt: new Date(occurrence.updatedAt),
        completedAt: occurrence.completedAt ? new Date(occurrence.completedAt) : null,
      })),
    [occurrences],
  );

  const today = startOfDay(new Date());
  const baseOccurrences =
    scope === "mine" && currentMemberId
      ? normalizedOccurrences.filter((occurrence) => occurrence.assignedMemberId === currentMemberId)
      : normalizedOccurrences;

  const filteredActiveOccurrences = baseOccurrences.filter((occurrence) => {
    const isActive = ACTIVE_STATUSES.has(occurrence.status);
    const isDone = occurrence.status === "completed" || occurrence.status === "skipped";
    
    if (filterType === "active" && !isActive) return false;
    if (filterType === "history" && !isDone) return false;
    
    if (roomFilter !== "all" && (occurrence.taskTemplate.room?.trim() || "Tout l'appartement") !== roomFilter) return false;
    if (assigneeFilter !== "all" && occurrence.assignedMemberId !== assigneeFilter) return false;
    if (overdueOnly && occurrence.status !== "overdue") return false;

    const haystack = [
      occurrence.taskTemplate.title,
      occurrence.taskTemplate.room ?? "",
      occurrence.taskTemplate.category ?? "",
      occurrence.assignedMember?.displayName ?? "",
      occurrence.status === "completed" ? "terminée fait" : "",
      occurrence.status === "skipped" ? "sautée" : "",
      occurrence.status === "cancelled" ? "annulée" : "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });

  const sortedFiltered = useMemo(() => {
    return [...filteredActiveOccurrences].sort((left, right) => {
      if (filterType === "active") {
        // Sort by status priority: overdue first, then by date
        if (left.status === "overdue" && right.status !== "overdue") return -1;
        if (left.status !== "overdue" && right.status === "overdue") return 1;

        if (left.scheduledDate.getTime() !== right.scheduledDate.getTime()) {
          return left.scheduledDate.getTime() - right.scheduledDate.getTime();
        }
      } else {
        // History: Most recent first
        if (left.scheduledDate.getTime() !== right.scheduledDate.getTime()) {
          return right.scheduledDate.getTime() - left.scheduledDate.getTime();
        }
      }

      return left.taskTemplate.title.localeCompare(right.taskTemplate.title, "fr");
    });
  }, [filteredActiveOccurrences, filterType]);

  const timelineGroups = useMemo(() => {
    const groups: { label: string; date?: Date; occurrences: WorkspaceOccurrence[] }[] = [];
    
    const overdue = sortedFiltered.filter(o => o.status === "overdue" && startOfDay(o.scheduledDate) < today);
    if (overdue.length > 0) {
      groups.push({ label: "En retard", occurrences: overdue });
    }

    const others = sortedFiltered.filter(o => !(o.status === "overdue" && startOfDay(o.scheduledDate) < today));
    
    const dayMap = new Map<string, WorkspaceOccurrence[]>();
    others.forEach(o => {
      const key = startOfDay(o.scheduledDate).toISOString();
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(o);
    });

    const sortedDays = [...dayMap.keys()].sort();
    if (filterType === "history") sortedDays.reverse();
    
    sortedDays.forEach(key => {
      const date = new Date(key);
      const occurrences = dayMap.get(key)!;
      
      // Filter by horizon
      const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= horizon && filterType === "active" && !search) return;

      let label = "";
      
      if (isSameDay(date, today)) label = "Aujourd'hui";
      else if (isSameDay(date, addDays(today, 1))) label = "Demain";
      else if (date < addDays(today, 7)) {
        label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric" }).format(date);
      } else {
        label = new Intl.DateTimeFormat("fr-FR", { month: "long", day: "numeric" }).format(date);
      }

      const existing = groups.find(g => g.label === label);
      if (existing) {
        existing.occurrences.push(...occurrences);
      } else {
        groups.push({ label, date, occurrences });
      }
    });

    return groups;
  }, [sortedFiltered, today, horizon, filterType, search]);

  const busiestNowRoom = useMemo(() => {
    const now = sortedFiltered.filter(o => startOfDay(o.scheduledDate).getTime() <= today.getTime() && ACTIVE_STATUSES.has(o.status));
    const groups = groupOccurrencesByRoom(now);
    return groups.sort((a, b) => {
      const aOverdue = a.occurrences.filter((o) => o.status === "overdue").length;
      const bOverdue = b.occurrences.filter((o) => o.status === "overdue").length;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      return b.occurrences.length - a.occurrences.length;
    })[0] ?? null;
  }, [sortedFiltered, today]);

  const rooms = useMemo(
    () =>
      [...new Set(
        normalizedOccurrences
          .filter((occurrence) => ACTIVE_STATUSES.has(occurrence.status))
          .map((occurrence) => occurrence.taskTemplate.room?.trim() || "Tout l'appartement"),
      )].sort((left, right) => left.localeCompare(right, "fr")),
    [normalizedOccurrences],
  );

  const occurrenceById = useMemo(
    () =>
      Object.fromEntries(
        normalizedOccurrences.map((occurrence) => [occurrence.id, occurrence] as const),
      ),
    [normalizedOccurrences],
  );

  const activeRunningSession = sanitizeRunningSession(runningSession, occurrenceById);

  useEffect(() => {
    if (!activeRunningSession) {
      window.localStorage.removeItem(sessionStorageKey);
      return;
    }

    window.localStorage.setItem(sessionStorageKey, JSON.stringify(activeRunningSession));
  }, [activeRunningSession, sessionStorageKey]);

  const currentRunningOccurrence = activeRunningSession
    ? occurrenceById[activeRunningSession.occurrenceIds[activeRunningSession.currentIndex]] ?? null
    : null;

  const effectiveElapsedMs =
    activeRunningSession
      ? activeRunningSession.elapsedMs +
        (activeRunningSession.status === "running" && activeRunningSession.startedAt
          ? Math.max(0, clock - activeRunningSession.startedAt)
          : 0)
      : 0;

  useEffect(() => {
    if (!activeRunningSession || activeRunningSession.status !== "running") {
      return;
    }

    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeRunningSession]);

  useEffect(() => {
    function syncSession(event: StorageEvent) {
      if (event.key !== sessionStorageKey) {
        return;
      }

      setRunningSession(parseStoredRunningSession(event.newValue));
    }

    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [sessionStorageKey]);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoStartSession || autoStartedRef.current || activeRunningSession || !busiestNowRoom) {
      return;
    }
    autoStartedRef.current = true;
    startRoomSession(busiestNowRoom.room, busiestNowRoom.occurrences, Date.now());
    // Strip the ?start param from the URL so reload doesn't re-trigger
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("start");
      window.history.replaceState(null, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartSession, activeRunningSession, busiestNowRoom]);

  function startRoomSession(room: string, roomOccurrences: WorkspaceOccurrence[], startedAt: number) {
    setRunningSession({
      room,
      occurrenceIds: roomOccurrences.map((occurrence) => occurrence.id),
      currentIndex: 0,
      status: "running",
      startedAt,
      elapsedMs: 0,
      mode: "room",
    });
    setClock(startedAt);
    setSessionDoneCount(0);
    setSessionSkippedCount(0);
    success(`Session lancée pour ${room}.`);
  }

  function startOptimizedSession(horizonDays: number, startedAt: number) {
    const cutoff = addDays(today, horizonDays);
    const occs = filteredActiveOccurrences
      .filter((o) => startOfDay(o.scheduledDate).getTime() < cutoff.getTime())
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    if (occs.length === 0) {
      showError("Aucune tâche à planifier dans cette plage.");
      return;
    }

    setRunningSession({
      room: `Plan optimisé · ${horizonDays} jour${horizonDays > 1 ? "s" : ""}`,
      occurrenceIds: occs.map((o) => o.id),
      currentIndex: 0,
      status: "running",
      startedAt,
      elapsedMs: 0,
      mode: "optimized",
      horizonDays,
    });
    setClock(startedAt);
    setSessionDoneCount(0);
    setSessionSkippedCount(0);
    setShowOptimizedPicker(false);
    success(
      `Mode optimisé · ${occs.length} tâche${occs.length > 1 ? "s" : ""} sur ${horizonDays} jour${horizonDays > 1 ? "s" : ""}.`,
    );
  }

  function stopSession() {
    if (sessionDoneCount > 0 || sessionSkippedCount > 0) {
      const done = sessionDoneCount;
      const skipped = sessionSkippedCount;
      const parts: string[] = [];
      if (done > 0) parts.push(`${done} tâche${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""}`);
      if (skipped > 0) parts.push(`${skipped} passée${skipped > 1 ? "s" : ""}`);
      success(`Session arrêtée. ${parts.join(", ")}.`);
    }
    clearSession();
  }

  function pauseOrResumeSession(eventTimeMs: number) {
    if (!activeRunningSession) return;

    if (activeRunningSession.status === "running" && activeRunningSession.startedAt) {
      setRunningSession({
        ...activeRunningSession,
        status: "paused",
        elapsedMs: activeRunningSession.elapsedMs + Math.max(0, eventTimeMs - activeRunningSession.startedAt),
        startedAt: null,
      });
      setClock(eventTimeMs);
      return;
    }

    setRunningSession({
      ...activeRunningSession,
      status: "running",
      startedAt: eventTimeMs,
    });
    setClock(eventTimeMs);
  }

  function clearSession() {
    setRunningSession(null);
  }

  function advanceSession(startedAt: number) {
    setRunningSession((current) => {
      if (!current) return null;
      if (current.currentIndex >= current.occurrenceIds.length - 1) {
        return null;
      }

      return {
        ...current,
        currentIndex: current.currentIndex + 1,
        status: "running",
        startedAt,
        elapsedMs: 0,
      };
    });
    setClock(startedAt);
  }

  async function postTimerAction(url: string, body: Record<string, string>) {
    const formData = new FormData();
    Object.entries(body).forEach(([key, value]) => formData.set(key, value));
    if (currentMemberId) formData.set("memberId", currentMemberId);
    formData.set("nextPath", dashboardPath);

    const csrfToken = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/)?.[1] ?? "";
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
        "x-requested-with": "fetch",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  async function finishCurrentRunningTask() {
    if (!activeRunningSession || !currentRunningOccurrence || isSubmitting) return;

    const isLast = activeRunningSession.currentIndex >= activeRunningSession.occurrenceIds.length - 1;
    const newDoneCount = sessionDoneCount + 1;

    setIsSubmitting(true);
    try {
      const elapsedMinutes = Math.max(1, Math.round(effectiveElapsedMs / 60000));
      await postTimerAction(`/api/occurrences/${currentRunningOccurrence.id}/complete`, {
        actualMinutes: String(elapsedMinutes),
      });

      if (isLast) {
        const parts: string[] = [];
        if (newDoneCount > 0) parts.push(`${newDoneCount} tâche${newDoneCount > 1 ? "s" : ""} faite${newDoneCount > 1 ? "s" : ""}`);
        if (sessionSkippedCount > 0) parts.push(`${sessionSkippedCount} passée${sessionSkippedCount > 1 ? "s" : ""}`);
        success(`Session terminée ! ${parts.join(", ")}.`);
        clearSession();
      } else {
        setSessionDoneCount(newDoneCount);
        success(`${currentRunningOccurrence.taskTemplate.title} terminée.`);
        advanceSession(clock);
      }
      router.refresh();
    } catch {
      showError("Impossible de terminer cette tâche depuis le suivi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function skipCurrentRunningTask() {
    if (!activeRunningSession || !currentRunningOccurrence || isSubmitting) return;

    const isLast = activeRunningSession.currentIndex >= activeRunningSession.occurrenceIds.length - 1;
    const newSkippedCount = sessionSkippedCount + 1;

    setIsSubmitting(true);
    try {
      await postTimerAction(`/api/occurrences/${currentRunningOccurrence.id}/skip`, {});

      if (isLast) {
        const parts: string[] = [];
        if (sessionDoneCount > 0) parts.push(`${sessionDoneCount} tâche${sessionDoneCount > 1 ? "s" : ""} faite${sessionDoneCount > 1 ? "s" : ""}`);
        if (newSkippedCount > 0) parts.push(`${newSkippedCount} passée${newSkippedCount > 1 ? "s" : ""}`);
        success(`Session terminée. ${parts.join(", ")}.`);
        clearSession();
      } else {
        setSessionSkippedCount(newSkippedCount);
        success(`${currentRunningOccurrence.taskTemplate.title} passée.`);
        advanceSession(clock);
      }
      router.refresh();
    } catch {
      showError("Impossible de passer cette tâche depuis le suivi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const sessionNextOccurrence = activeRunningSession
    ? (() => {
        const nextIdx = activeRunningSession.currentIndex + 1;
        return nextIdx < activeRunningSession.occurrenceIds.length
          ? occurrenceById[activeRunningSession.occurrenceIds[nextIdx]] ?? null
          : null;
      })()
    : null;

  return (
    <div className="space-y-4">
      {activeRunningSession && currentRunningOccurrence ? (
        <FocusSession
          room={activeRunningSession.room}
          status={activeRunningSession.status}
          currentIndex={activeRunningSession.currentIndex}
          totalCount={activeRunningSession.occurrenceIds.length}
          currentOccurrence={currentRunningOccurrence}
          nextOccurrence={sessionNextOccurrence}
          elapsedMs={effectiveElapsedMs}
          isSubmitting={isSubmitting}
          onPauseOrResume={pauseOrResumeSession}
          onFinishWithTimer={finishCurrentRunningTask}
          onSkip={skipCurrentRunningTask}
          onStop={stopSession}
        />
      ) : null}

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
              className="ml-auto text-[0.65rem] font-bold uppercase tracking-wider text-[var(--coral-600)] hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </section>

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="display-title text-3xl">
              {search ? "Tâches correspondantes" : "Tâches à venir"}
            </h3>
            <div aria-live="polite" className="mt-1 flex items-center gap-1.5 rounded-full bg-[var(--ink-50)] px-2.5 py-1 text-[11px] font-bold text-[var(--ink-500)]">
              <span className="size-1.5 rounded-full bg-[var(--coral-500)]" />
              {filteredActiveOccurrences.length}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {currentMemberId && (
              <button
                onClick={() => setScope(scope === "mine" ? "household" : "mine")}
                className="btn-quiet flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
                type="button"
              >
                <div className={cn("size-2 rounded-full", scope === "mine" ? "bg-[var(--coral-500)]" : "bg-[var(--ink-300)]")} />
                {scope === "mine" ? "Tout le foyer" : "Mes tâches"}
              </button>
            )}

            <button
              onClick={() => setFilterType(filterType === "active" ? "history" : "active")}
              className="btn-quiet flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
              type="button"
            >
              <div className={cn("size-2 rounded-full", filterType === "active" ? "bg-[var(--leaf-500)]" : "bg-[var(--ink-300)]")} />
              {filterType === "active" ? "Historique" : "À faire"}
            </button>

            <button
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                overdueOnly
                  ? "border-[rgba(127,29,29,0.2)] bg-[rgba(127,29,29,0.08)] text-[#7f1d1d]"
                  : "btn-quiet text-[var(--ink-500)]"
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

        <div className="mt-6 space-y-8">
          {timelineGroups.length > 0 ? (
            timelineGroups.map((group) => (
              <div key={group.label} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-500)]">
                    {group.label}
                  </h4>
                  <div className="h-px flex-1 bg-[var(--line)]" />
                </div>
                
                <div className="grid gap-3">
                  {group.occurrences.map((occurrence) => (
                    <OccurrenceCard
                      key={occurrence.id}
                      compact={!isSameDay(occurrence.scheduledDate, today) && occurrence.status !== "overdue"}
                      occurrence={occurrence}
                      members={members}
                      currentMemberId={currentMemberId}
                      returnTo={dashboardPath}
                      householdId={householdId}
                      canEditTemplate={manageable}
                      taskTemplateId={occurrence.taskTemplateId}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-8 text-center text-sm text-[var(--ink-700)]">
              {search 
                ? "Aucune tâche ne correspond à votre recherche."
                : "Rien de prévu pour le moment. Profitez-en !"}
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 block w-full text-xs font-bold text-[var(--coral-600)] hover:underline"
                >
                  Réinitialiser la recherche
                </button>
              )}
            </div>
          )}
        </div>

        {filterType === "active" && !search && (
          <div className="mt-8 flex flex-col items-center gap-3 border-t border-[var(--line)] pt-8">
            <div className="flex gap-2">
              {horizon === 3 && (
                <button
                  onClick={() => setHorizon(7)}
                  className="rounded-full bg-[var(--ink-50)] px-6 py-2.5 text-xs font-bold text-[var(--ink-700)] transition-all hover:bg-[var(--ink-100)] hover:scale-105 active:scale-95 shadow-sm"
                >
                  Étendre à la semaine
                </button>
              )}
              {horizon === 7 && (
                <button
                  onClick={() => setHorizon(30)}
                  className="rounded-full bg-[var(--ink-50)] px-6 py-2.5 text-xs font-bold text-[var(--ink-700)] transition-all hover:bg-[var(--ink-100)] hover:scale-105 active:scale-95 shadow-sm"
                >
                  Étendre au mois
                </button>
              )}
              {horizon > 3 && (
                <button
                  onClick={() => setHorizon(3)}
                  className="rounded-full bg-[var(--ink-50)] px-6 py-2.5 text-xs font-bold text-[var(--ink-400)] transition-all hover:bg-[var(--ink-100)] hover:text-[var(--ink-600)]"
                >
                  Réduire
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <BottomSheet
        isOpen={showOptimizedPicker}
        onClose={() => setShowOptimizedPicker(false)}
        title="Mode optimisé"
      >
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[var(--ink-700)]">
            Regroupez les tâches d&apos;aujourd&apos;hui et des prochains jours en une seule session.
            À chaque tâche terminée, le calendrier des occurrences suivantes est recalculé à partir de
            la date de réalisation.
          </p>
          {[1, 2, 3].map((h) => {
            const cutoff = addDays(today, h);
            const count = filteredActiveOccurrences.filter(
              (o) => startOfDay(o.scheduledDate).getTime() < cutoff.getTime(),
            ).length;
            const label =
              h === 1 ? "Aujourd'hui" : h === 2 ? "Aujourd'hui + demain" : "Aujourd'hui + 2 jours";
            return (
              <button
                key={h}
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left transition-all hover:bg-black/[0.04] active:scale-[0.98] disabled:opacity-40"
                disabled={count === 0}
                onClick={(event) => startOptimizedSession(h, getEventTimeMs(event.timeStamp))}
                type="button"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-950)]">{label}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-500)]">
                    {h} jour{h > 1 ? "s" : ""} de planning
                  </p>
                </div>
                <span className="stat-pill px-3 py-1 text-xs font-semibold">
                  {count} tâche{count > 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
