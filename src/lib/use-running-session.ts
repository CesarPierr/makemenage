"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/ui/toast";
import {
  getRunningSessionStorageKey,
  parseStoredRunningSession,
  sanitizeRunningSession,
  type RunningSession,
} from "@/lib/running-session";

type SessionOccurrence = {
  id: string;
  status: string;
  taskTemplate: { title: string };
};

type StartSessionPayload = {
  room: string;
  occurrenceIds: string[];
  startedAt: number;
  mode: "room" | "optimized";
  horizonDays?: number;
};

type UseRunningSessionOptions<T extends SessionOccurrence> = {
  householdId: string;
  currentMemberId?: string | null;
  occurrenceById: Record<string, T>;
  /** Path used as `nextPath` on the complete/skip POSTs from the focus session. */
  dashboardPath: string;
};

/**
 * Owns the local-only state of the workspace "focus session" — the in-progress
 * timer that walks through a list of occurrences. Persists to localStorage,
 * keeps a ticking clock while running, sanitizes the session against the
 * current occurrence list (drops cancelled/completed entries on rehydrate),
 * and exposes start/finish/skip actions that POST to the existing API routes.
 */
export function useRunningSession<T extends SessionOccurrence>({
  householdId,
  currentMemberId,
  occurrenceById,
  dashboardPath,
}: UseRunningSessionOptions<T>) {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const sessionStorageKey = useMemo(
    () => getRunningSessionStorageKey(householdId, currentMemberId),
    [householdId, currentMemberId],
  );

  const [runningSession, setRunningSession] = useState<RunningSession | null>(() => {
    if (typeof window === "undefined") return null;
    return parseStoredRunningSession(window.localStorage.getItem(sessionStorageKey));
  });
  const [clock, setClock] = useState(0);
  const [sessionDoneCount, setSessionDoneCount] = useState(0);
  const [sessionSkippedCount, setSessionSkippedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeRunningSession = sanitizeRunningSession(runningSession, occurrenceById);

  useEffect(() => {
    if (!activeRunningSession) {
      window.localStorage.removeItem(sessionStorageKey);
      return;
    }
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(activeRunningSession));
  }, [activeRunningSession, sessionStorageKey]);

  useEffect(() => {
    function syncSession(event: StorageEvent) {
      if (event.key !== sessionStorageKey) return;
      setRunningSession(parseStoredRunningSession(event.newValue));
    }
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [sessionStorageKey]);

  useEffect(() => {
    if (!activeRunningSession || activeRunningSession.status !== "running") return;
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeRunningSession]);

  const currentRunningOccurrence = activeRunningSession
    ? occurrenceById[activeRunningSession.occurrenceIds[activeRunningSession.currentIndex]] ?? null
    : null;

  const sessionNextOccurrence = activeRunningSession
    ? occurrenceById[activeRunningSession.occurrenceIds[activeRunningSession.currentIndex + 1]] ?? null
    : null;

  const effectiveElapsedMs = activeRunningSession
    ? activeRunningSession.elapsedMs +
      (activeRunningSession.status === "running" && activeRunningSession.startedAt
        ? Math.max(0, clock - activeRunningSession.startedAt)
        : 0)
    : 0;

  function startSession(payload: StartSessionPayload) {
    setRunningSession({
      room: payload.room,
      occurrenceIds: payload.occurrenceIds,
      currentIndex: 0,
      status: "running",
      startedAt: payload.startedAt,
      elapsedMs: 0,
      mode: payload.mode,
      horizonDays: payload.horizonDays,
    });
    setClock(payload.startedAt);
    setSessionDoneCount(0);
    setSessionSkippedCount(0);
  }

  function clearSession() {
    setRunningSession(null);
  }

  function pauseOrResumeSession(eventTimeMs: number) {
    if (!activeRunningSession) return;

    if (activeRunningSession.status === "running" && activeRunningSession.startedAt) {
      setRunningSession({
        ...activeRunningSession,
        status: "paused",
        elapsedMs:
          activeRunningSession.elapsedMs + Math.max(0, eventTimeMs - activeRunningSession.startedAt),
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

  function stopSession() {
    if (sessionDoneCount > 0 || sessionSkippedCount > 0) {
      const parts: string[] = [];
      if (sessionDoneCount > 0) {
        parts.push(`${sessionDoneCount} tâche${sessionDoneCount > 1 ? "s" : ""} faite${sessionDoneCount > 1 ? "s" : ""}`);
      }
      if (sessionSkippedCount > 0) {
        parts.push(`${sessionSkippedCount} passée${sessionSkippedCount > 1 ? "s" : ""}`);
      }
      success(`Session arrêtée. ${parts.join(", ")}.`);
    }
    clearSession();
  }

  function advanceSession(startedAt: number) {
    setRunningSession((current) => {
      if (!current) return null;
      if (current.currentIndex >= current.occurrenceIds.length - 1) return null;
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

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
        if (newDoneCount > 0) {
          parts.push(`${newDoneCount} tâche${newDoneCount > 1 ? "s" : ""} faite${newDoneCount > 1 ? "s" : ""}`);
        }
        if (sessionSkippedCount > 0) {
          parts.push(`${sessionSkippedCount} passée${sessionSkippedCount > 1 ? "s" : ""}`);
        }
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
        if (sessionDoneCount > 0) {
          parts.push(`${sessionDoneCount} tâche${sessionDoneCount > 1 ? "s" : ""} faite${sessionDoneCount > 1 ? "s" : ""}`);
        }
        if (newSkippedCount > 0) {
          parts.push(`${newSkippedCount} passée${newSkippedCount > 1 ? "s" : ""}`);
        }
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

  return {
    activeRunningSession,
    currentRunningOccurrence,
    sessionNextOccurrence,
    effectiveElapsedMs,
    isSubmitting,
    sessionDoneCount,
    sessionSkippedCount,
    startSession,
    stopSession,
    pauseOrResumeSession,
    finishCurrentRunningTask,
    skipCurrentRunningTask,
  };
}
