"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Plus, Settings2 } from "lucide-react";

import { useToast } from "@/components/ui/toast";

type QuickAddBarProps = {
  householdId: string;
  manageable: boolean;
};

export function QuickAddBar({ householdId, manageable }: QuickAddBarProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!manageable) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const formData = new FormData();
      formData.set("householdId", householdId);
      formData.set("title", trimmed);
      formData.set("estimatedMinutes", "15");
      formData.set("startsOn", today);
      formData.set("endsOn", today);
      formData.set("recurrenceType", "single");
      formData.set("singleRun", "on");
      formData.set("interval", "1");
      formData.set("assignmentMode", "fixed");
      formData.set("nextPath", `/app?household=${householdId}`);

      const csrf = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/)?.[1] ?? "";
      const response = await fetch("/api/tasks", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "x-requested-with": "fetch",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
      });

      if (!response.ok && !response.redirected) {
        throw new Error(`HTTP ${response.status}`);
      }
      success(`« ${trimmed} » ajoutée pour aujourd'hui.`);
      setTitle("");
      router.refresh();
    } catch {
      showError("Impossible d'ajouter cette tâche.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={handleSubmit}
    >
      <label className="flex-1">
        <span className="sr-only">Nouvelle tâche pour aujourd&apos;hui</span>
        <input
          aria-label="Nouvelle tâche"
          className="field h-11 w-full border-0 bg-transparent px-3 text-[0.95rem] focus:ring-0"
          disabled={isSubmitting}
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder="Ajouter une tâche pour aujourd'hui…"
          type="text"
          value={title}
        />
      </label>
      <button
        aria-label="Ajouter la tâche"
        className="btn-primary inline-flex size-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-60"
        disabled={!title.trim() || isSubmitting}
        type="submit"
      >
        <Plus className="size-5" />
      </button>
      <Link
        aria-label="Créer une tâche récurrente complète"
        className="btn-quiet hidden size-11 shrink-0 items-center justify-center rounded-xl text-ink-500 sm:inline-flex"
        href={`/app/settings/tasks?household=${householdId}&tab=wizard`}
        title="Configurer une tâche récurrente"
      >
        <Settings2 className="size-5" />
      </Link>
    </form>
  );
}
