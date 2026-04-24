"use client";

import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Pause, Play, Search, SkipForward, TimerReset } from "lucide-react";

import { CollapsibleList } from "@/components/collapsible-list";
import { OccurrenceCard } from "@/components/occurrence-card";
import { QuickAddBar } from "@/components/quick-add-bar";
import { useToast } from "@/components/ui/toast";
import { groupOccurrencesByRoom, sumOccurrenceMinutes } from "@/lib/experience";
import { formatMinutes } from "@/lib/utils";

const ACTIVE_STATUSES = new Set(["planned", "due", "overdue", "rescheduled"]);

type WorkspaceOccurrence = {
  id: string;
  scheduledDate: Date | string;
  status: string;
  notes: string | null;
  actualMinutes: number | null;
  assignedMemberId?: string | null;
  taskTemplateId?: string;
  isManuallyModified?: boolean;
  taskTemplate: {
    title: string;
    category: string | null;
    room?: string | null;
    estimatedMinutes: number;
    color: string;
    isCollective?: boolean;
  };
  assignedMember: { id: string; displayName: string; color: string } | null;
  wasCompletedAlone?: boolean | null;
};

type RunningSession = {
  room: string;
  occurrenceIds: string[];
  currentIndex: number;
  status: "running" | "paused";
  startedAt: number | null;
  elapsedMs: number;
};

type TaskWorkspaceClientProps = {
  householdId: string;
  currentMemberId?: string | null;
  manageable: boolean;
  members: { id: string; displayName: string }[];
  occurrences: WorkspaceOccurrence[];
};

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getSessionStorageKey(householdId: string, currentMemberId?: string | null) {
  return `makemenage:running-session:${householdId}:${currentMemberId ?? "shared"}`;
}

function getEventTimeMs(eventTimeStamp: number) {
  return Math.round(performance.timeOrigin + eventTimeStamp);
}

function parseStoredRunningSession(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as RunningSession;
  } catch {
    return null;
  }
}

function sanitizeRunningSession(
  session: RunningSession | null,
  occurrenceById: Record<string, WorkspaceOccurrence>,
) {
  if (!session) {
    return null;
  }

  const validOccurrenceIds = session.occurrenceIds.filter((occurrenceId) => {
    const occurrence = occurrenceById[occurrenceId];
    return occurrence ? ACTIVE_STATUSES.has(occurrence.status) : false;
  });

  if (!validOccurrenceIds.length) {
    return null;
  }

  return {
    ...session,
    occurrenceIds: validOccurrenceIds,
    currentIndex: Math.min(session.currentIndex, validOccurrenceIds.length - 1),
    elapsedMs: Math.max(0, session.elapsedMs),
    startedAt: session.startedAt ? Math.max(0, session.startedAt) : null,
  };
}

export function TaskWorkspaceClient({
  householdId,
  currentMemberId,
  manageable,
  members,
  occurrences,
}: TaskWorkspaceClientProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [scope, setScope] = useState<"mine" | "household">(currentMemberId ? "mine" : "household");
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const sessionStorageKey = getSessionStorageKey(householdId, currentMemberId);
  const [runningSession, setRunningSession] = useState<RunningSession | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return parseStoredRunningSession(window.localStorage.getItem(sessionStorageKey));
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clock, setClock] = useState(0);
  const [visibleAllCount, setVisibleAllCount] = useState(12);
  const [sessionDoneCount, setSessionDoneCount] = useState(0);
  const [sessionSkippedCount, setSessionSkippedCount] = useState(0);
  const dashboardPath = `/app?household=${householdId}`;

  const normalizedOccurrences = useMemo(
    () =>
      occurrences.map((occurrence) => ({
        ...occurrence,
        scheduledDate: new Date(occurrence.scheduledDate),
      })),
    [occurrences],
  );

  const today = startOfDay(new Date());
  const baseOccurrences =
    scope === "mine" && currentMemberId
      ? normalizedOccurrences.filter((occurrence) => occurrence.assignedMemberId === currentMemberId)
      : normalizedOccurrences;

  const filteredActiveOccurrences = baseOccurrences.filter((occurrence) => {
    if (!ACTIVE_STATUSES.has(occurrence.status)) return false;
    if (roomFilter !== "all" && (occurrence.taskTemplate.room?.trim() || "Tout l'appartement") !== roomFilter) return false;

    const haystack = [
      occurrence.taskTemplate.title,
      occurrence.taskTemplate.room ?? "",
      occurrence.taskTemplate.category ?? "",
      occurrence.assignedMember?.displayName ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });

  const nowOccurrences = filteredActiveOccurrences.filter((occurrence) => startOfDay(occurrence.scheduledDate) <= today);
  const nextOccurrences = filteredActiveOccurrences.filter(
    (occurrence) =>
      occurrence.scheduledDate > today && occurrence.scheduledDate <= addDays(today, 7),
  );
  const allActiveOccurrences = [...filteredActiveOccurrences].sort((left, right) => {
    if (left.scheduledDate.getTime() !== right.scheduledDate.getTime()) {
      return left.scheduledDate.getTime() - right.scheduledDate.getTime();
    }

    return left.taskTemplate.title.localeCompare(right.taskTemplate.title, "fr");
  });

  const rooms = useMemo(
    () =>
      [...new Set(
        normalizedOccurrences
          .filter((occurrence) => ACTIVE_STATUSES.has(occurrence.status))
          .map((occurrence) => occurrence.taskTemplate.room?.trim() || "Tout l'appartement"),
      )].sort((left, right) => left.localeCompare(right, "fr")),
    [normalizedOccurrences],
  );

  const nowGroups = groupOccurrencesByRoom(nowOccurrences);
  const nextGroups = groupOccurrencesByRoom(nextOccurrences);
  const nowMinutes = sumOccurrenceMinutes(nowOccurrences);

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

  function startRoomSession(room: string, roomOccurrences: WorkspaceOccurrence[], startedAt: number) {
    setRunningSession({
      room,
      occurrenceIds: roomOccurrences.map((occurrence) => occurrence.id),
      currentIndex: 0,
      status: "running",
      startedAt,
      elapsedMs: 0,
    });
    setClock(startedAt);
    setSessionDoneCount(0);
    setSessionSkippedCount(0);
    success(`Session lancée pour ${room}.`);
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

  return (
    <div className="space-y-4">
      <section className="app-surface glow-card rounded-[2rem] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="section-kicker">{format(new Date(), "EEEE d MMMM", { locale: fr })}</p>
            <p className="mt-1.5 text-sm text-[var(--ink-700)]">
              <span className="font-semibold text-[var(--coral-600)]">{nowOccurrences.length}</span>{" "}
              à faire
              {nowMinutes > 0 ? ` · ${formatMinutes(nowMinutes)}` : ""}
              {nextOccurrences.length > 0 ? ` · ${nextOccurrences.length} à venir` : ""}
              {activeRunningSession ? ` · Session : ${activeRunningSession.room}` : ""}
            </p>
          </div>
          <Link
            aria-label="Voir le planning"
            className="btn-quiet shrink-0 rounded-xl px-3 py-2 text-xs font-semibold"
            href={`/app/planifier?household=${householdId}`}
          >
            Planifier
          </Link>
        </div>

        {manageable ? (
          <div className="mt-4">
            <QuickAddBar householdId={householdId} manageable={manageable} />
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr_auto]">
          {currentMemberId ? (
            <div
              className="flex rounded-full border border-[var(--line)] bg-[rgba(30,31,34,0.05)] p-0.5"
              role="group"
              aria-label="Portée des tâches"
            >
              {[
                { value: "mine" as const, label: "Mes tâches" },
                { value: "household" as const, label: "Tout le foyer" },
              ].map((option) => (
                <button
                  key={option.value}
                  aria-pressed={scope === option.value}
                  className={
                    scope === option.value
                      ? "flex-1 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[var(--ink-950)] shadow-sm transition-all"
                      : "flex-1 rounded-full px-4 py-1.5 text-sm font-semibold text-[var(--ink-500)] transition-all"
                  }
                  onClick={() => setScope(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}

          <label className="field-label">
            <span className="sr-only">Rechercher une tâche</span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                <Search className="size-4 text-[var(--ink-400)]" />
              </div>
              <input
                className="field pl-10"
                onChange={(event) => {
                  setVisibleAllCount(12);
                  setSearch(event.currentTarget.value);
                }}
                placeholder="Rechercher une tâche, une pièce, une personne"
                type="search"
                value={search}
              />
            </div>
          </label>

          <label className="field-label">
            <span className="sr-only">Filtrer par pièce</span>
            <select
              className="field"
              onChange={(event) => {
                setVisibleAllCount(12);
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
          </label>
        </div>
      </section>

      <section aria-label="Tâches du jour" className="app-surface rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">À faire maintenant</p>
            <h3 className="display-title mt-2 text-3xl">Ce qu&apos;il reste</h3>
          </div>
          <span aria-live="polite" className="accent-pill">
            <span className="accent-pill-dot" style={{ backgroundColor: "var(--coral-500)" }} />
            {nowOccurrences.length} tâche{nowOccurrences.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {nowGroups.length ? (
            nowGroups.map(({ room, occurrences: roomOccurrences, totalMinutes }) => (
              <div key={room} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="stat-pill px-3 py-1 text-xs font-semibold">{room}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
                      {roomOccurrences.length} tâche{roomOccurrences.length > 1 ? "s" : ""}
                    </span>
                    <span className="stat-pill px-3 py-1 text-xs font-semibold">{formatMinutes(totalMinutes)}</span>
                  </div>
                  {!activeRunningSession ? (
                    <button
                      className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                      onClick={(event) => startRoomSession(room, roomOccurrences, getEventTimeMs(event.timeStamp))}
                      type="button"
                    >
                      <Play className="size-4" />
                      Lancer cette pièce
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {roomOccurrences.map((occurrence) => (
                      <OccurrenceCard
                        key={occurrence.id}
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
            <div className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-6 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-semibold text-[var(--ink-950)]">Tout est à jour !</p>
              <p className="mt-1 text-sm text-[var(--ink-700)]">
                Rien d&apos;urgent pour le moment. Regardez ce qui arrive dans les prochains jours.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">En cours</p>
            <h3 className="display-title mt-2 text-2xl">Suivi en direct</h3>
          </div>
          <span className="accent-pill">
            <span className="accent-pill-dot" style={{ backgroundColor: "var(--sky-500)" }} />
            {activeRunningSession ? activeRunningSession.room : "Aucune session"}
          </span>
        </div>

        <div className="mt-5">
          {activeRunningSession && currentRunningOccurrence ? (
            <div className="rounded-[1.6rem] border border-[var(--line)] bg-white/80 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-700)]">{activeRunningSession.room}</p>
                  <h4 className="mt-1 text-2xl font-semibold text-[var(--ink-950)]">
                    {currentRunningOccurrence.taskTemplate.title}
                  </h4>
                  <p className="mt-1 text-sm text-[var(--ink-700)]">
                    Tâche {activeRunningSession.currentIndex + 1} / {activeRunningSession.occurrenceIds.length}
                    {" "}· prévue pour {format(currentRunningOccurrence.scheduledDate, "d MMM", { locale: fr })}
                  </p>
                  {(() => {
                    const nextIdx = activeRunningSession.currentIndex + 1;
                    const nextOcc = nextIdx < activeRunningSession.occurrenceIds.length
                      ? occurrenceById[activeRunningSession.occurrenceIds[nextIdx]]
                      : null;
                    return nextOcc ? (
                      <p className="mt-1 text-xs text-[var(--ink-500)]">
                        Ensuite : <span className="font-semibold text-[var(--ink-700)]">{nextOcc.taskTemplate.title}</span>
                        {nextOcc.taskTemplate.estimatedMinutes ? ` · ${nextOcc.taskTemplate.estimatedMinutes} min` : ""}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div className="rounded-[1.4rem] border border-[var(--line)] bg-[rgba(47,109,136,0.08)] px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">Temps réel</p>
                  <p className="mt-1 text-3xl font-semibold text-[var(--ink-950)]">{formatElapsed(effectiveElapsedMs)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                  onClick={(event) => pauseOrResumeSession(getEventTimeMs(event.timeStamp))}
                  type="button"
                >
                  {activeRunningSession.status === "running" ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {activeRunningSession.status === "running" ? "Mettre en pause" : "Reprendre"}
                </button>
                <button
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                  disabled={isSubmitting}
                  onClick={finishCurrentRunningTask}
                  type="button"
                >
                  <Clock3 className="size-4" />
                  Terminer avec le temps réel
                </button>
                <button
                  className="btn-quiet inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
                  disabled={isSubmitting}
                  onClick={skipCurrentRunningTask}
                  type="button"
                >
                  <SkipForward className="size-4" />
                  Passer la tâche
                </button>
                <button
                  className="btn-quiet inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--ink-500)]"
                  onClick={stopSession}
                  type="button"
                >
                  <TimerReset className="size-4" />
                  Arrêter le suivi
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-5 text-sm text-[var(--ink-700)]">
              Aucune tâche en cours. Lancez une pièce depuis la liste du moment pour suivre le temps réel pas à pas.
            </div>
          )}
        </div>
      </section>

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Ensuite</p>
            <h3 className="display-title mt-2 text-3xl">Ce qui arrive</h3>
          </div>
          <span className="accent-pill">
            <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
            {nextOccurrences.length} tâche{nextOccurrences.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-5">
          {nextGroups.length ? (
            <CollapsibleList
              initialCount={3}
              label="Voir plus de groupes"
              items={nextGroups.map(({ room, occurrences: roomOccurrences, totalMinutes }) => (
                <div key={room} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="stat-pill px-3 py-1 text-xs font-semibold">{room}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
                        {roomOccurrences.length} tâche{roomOccurrences.length > 1 ? "s" : ""}
                      </span>
                      <span className="stat-pill px-3 py-1 text-xs font-semibold">{formatMinutes(totalMinutes)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {roomOccurrences.map((occurrence) => (
                      <OccurrenceCard
                        key={occurrence.id}
                        compact
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
              ))}
            />
          ) : (
            <div className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-5 text-sm text-[var(--ink-700)]">
              Rien de particulier dans les prochains jours.
            </div>
          )}
        </div>
      </section>

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Toutes les tâches</p>
            <h3 className="display-title mt-2 text-3xl">Retrouver n&apos;importe quelle tâche</h3>
          </div>
          <p aria-live="polite" className="text-sm text-[var(--ink-700)]">
            {allActiveOccurrences.length} tâche{allActiveOccurrences.length > 1 ? "s" : ""}
            {" "}active{allActiveOccurrences.length > 1 ? "s" : ""}
            {search || roomFilter !== "all" ? " après filtres" : ""}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {allActiveOccurrences.length ? (
            <>
              {allActiveOccurrences.slice(0, visibleAllCount).map((occurrence) => (
                <OccurrenceCard
                  key={occurrence.id}
                  compact={!isSameDay(occurrence.scheduledDate, today)}
                  occurrence={occurrence}
                  members={members}
                  currentMemberId={currentMemberId}
                  returnTo={dashboardPath}
                  householdId={householdId}
                  canEditTemplate={manageable}
                  taskTemplateId={occurrence.taskTemplateId}
                />
              ))}

              {visibleAllCount < allActiveOccurrences.length ? (
                <button
                  className="btn-quiet w-full px-4 py-3 text-sm font-semibold"
                  onClick={() => setVisibleAllCount((current) => current + 12)}
                  type="button"
                >
                  Voir plus de tâches ({allActiveOccurrences.length - visibleAllCount})
                </button>
              ) : null}
            </>
          ) : (
            <div className="rounded-[1.6rem] border border-[var(--line)] bg-white/75 p-5 text-center text-sm text-[var(--ink-700)]">
              Aucune tâche ne correspond à vos critères.
              <br />
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-[var(--coral-600)] hover:underline"
                onClick={() => { setSearch(""); setScope(currentMemberId ? "mine" : "household"); setRoomFilter("all"); }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
