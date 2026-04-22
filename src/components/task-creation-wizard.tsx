"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Plus, TimerReset } from "lucide-react";

import { roomSuggestions, taskPalette } from "@/lib/constants";
import { cn, formatMinutes } from "@/lib/utils";

type TaskCreationWizardProps = {
  householdId: string;
  members: { id: string; displayName: string; color?: string }[];
};

type DraftTask = {
  kind: "single" | "recurring";
  title: string;
  estimatedMinutes: string;
  category: string;
  room: string;
  color: string;
  startsOn: string;
  recurrenceType: string;
  interval: string;
  assignmentMode: string;
  eligibleMemberIds: string[];
};

const recurrenceOptions = [
  { value: "daily", label: "Tous les jours", icon: CalendarClock },
  { value: "weekly", label: "Chaque semaine", icon: CalendarClock },
  { value: "monthly_simple", label: "Chaque mois", icon: CalendarClock },
  { value: "every_x_days", label: "Tous les X jours", icon: TimerReset },
  { value: "every_x_weeks", label: "Toutes les X semaines", icon: TimerReset },
];

const assignmentOptions = [
  { value: "strict_alternation", label: "Alternance", hint: "Chacun son tour" },
  { value: "least_assigned_count", label: "Équité", hint: "Moins de tâches" },
  { value: "least_assigned_minutes", label: "Équité temps", hint: "Moins de minutes" },
  { value: "round_robin", label: "Rotation", hint: "Distribution circulaire" },
  { value: "fixed", label: "Fixe", hint: "Toujours la même personne" },
  { value: "manual", label: "Manuelle", hint: "Choix au cas par cas" },
];

function buildInitialDraft(memberIds: string[]): DraftTask {
  return {
    kind: "recurring",
    title: "",
    estimatedMinutes: "20",
    category: "",
    room: "",
    color: taskPalette[0],
    startsOn: new Date().toISOString().split("T")[0],
    recurrenceType: "weekly",
    interval: "1",
    assignmentMode: "strict_alternation",
    eligibleMemberIds: memberIds,
  };
}

export function TaskCreationWizard({ householdId, members }: TaskCreationWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isStep3Armed, setIsStep3Armed] = useState(false);
  const [draft, setDraft] = useState<DraftTask>(() => buildInitialDraft(members.map((member) => member.id)));

  const isSingleTask = draft.kind === "single";
  const everyXMode = draft.recurrenceType === "every_x_days" || draft.recurrenceType === "every_x_weeks";
  const selectedMembers = members.filter((member) => draft.eligibleMemberIds.includes(member.id));
  const recurrenceLabel = isSingleTask
    ? "Une seule fois"
    : recurrenceOptions.find((option) => option.value === draft.recurrenceType)?.label ?? "Récurrente";
  const selectedAssignmentLabel = isSingleTask
    ? "Fixe"
    : assignmentOptions.find((option) => option.value === draft.assignmentMode)?.label ?? "Attribution";

  useEffect(() => {
    if (step !== 3) {
      return;
    }

    const timeout = window.setTimeout(() => setIsStep3Armed(true), 120);
    return () => window.clearTimeout(timeout);
  }, [step]);

  function updateDraft<K extends keyof DraftTask>(key: K, value: DraftTask[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleMember(memberId: string) {
    if (draft.kind === "single" || draft.assignmentMode === "fixed") {
      setDraft((current) => ({
        ...current,
        eligibleMemberIds: [memberId],
      }));
      return;
    }

    setDraft((current) => ({
      ...current,
      eligibleMemberIds: current.eligibleMemberIds.includes(memberId)
        ? current.eligibleMemberIds.filter((id) => id !== memberId)
        : [...current.eligibleMemberIds, memberId],
    }));
  }

  function resetWizard() {
    setIsOpen(false);
    setStep(1);
    setIsStep3Armed(false);
    setDraft(buildInitialDraft(members.map((member) => member.id)));
  }

  return (
    <section className="page-enter">
      {!isOpen ? (
        <button
          className="app-surface flex w-full items-center gap-4 rounded-[2rem] p-5 text-left sm:p-6"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-[rgba(47,109,136,0.12)] text-[var(--sky-600)]">
            <Plus className="size-6" />
          </span>
          <div>
            <p className="section-kicker">Nouvelle tâche</p>
            <h3 className="display-title mt-1 text-2xl">Créer une nouvelle tâche</h3>
            <p className="mt-1 text-sm text-[var(--ink-700)]">Simple une fois ou récurrente, sans configuration lourde.</p>
          </div>
        </button>
      ) : (
        <div className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Étape {step} / 3</p>
              <h3 className="display-title mt-1 text-2xl">
                {step === 1 ? "La tâche" : step === 2 ? (isSingleTask ? "La date" : "Le rythme") : (isSingleTask ? "L’attribution" : "L’attribution")}
              </h3>
            </div>
            <button className="btn-quiet px-4 py-2 text-sm font-semibold" onClick={resetWizard} type="button">
              Fermer
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { index: 1, label: "La tâche" },
              { index: 2, label: isSingleTask ? "La date" : "Le rythme" },
              { index: 3, label: "L’attribution" },
            ].map((item) => {
              const active = step === item.index;
              const completed = step > item.index;

              return (
                <div
                  key={`${item.index}-${item.label}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]",
                    active
                      ? "border-[var(--sky-500)] bg-[rgba(47,109,136,0.12)] text-[var(--sky-700)]"
                      : completed
                        ? "border-[rgba(56,115,93,0.18)] bg-[rgba(56,115,93,0.1)] text-[var(--leaf-600)]"
                        : "border-[var(--line)] bg-white/70 text-[var(--ink-500)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[0.68rem]",
                      active
                        ? "bg-[var(--sky-500)] text-white"
                        : completed
                          ? "bg-[var(--leaf-500)] text-white"
                          : "bg-[var(--line)] text-[var(--ink-700)]",
                    )}
                  >
                    {completed ? <Check className="size-3" /> : item.index}
                  </span>
                  {item.label}
                </div>
              );
            })}
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full bg-[var(--sky-500)] transition-all duration-200"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <form
            action="/api/tasks"
            className="mt-6 compact-form-grid"
            method="post"
            onSubmit={(event) => {
              if (step < 3 || !draft.title.trim() || draft.eligibleMemberIds.length === 0) {
                event.preventDefault();
              }
            }}
          >
            <input name="householdId" type="hidden" value={householdId} />
            <input name="title" type="hidden" value={draft.title} />
            <input name="estimatedMinutes" type="hidden" value={draft.estimatedMinutes || "1"} />
            <input name="category" type="hidden" value={draft.category} />
            <input name="room" type="hidden" value={draft.room} />
            <input name="color" type="hidden" value={draft.color} />
            <input name="startsOn" type="hidden" value={draft.startsOn} />
            <input name="endsOn" type="hidden" value={isSingleTask ? draft.startsOn : ""} />
            <input name="singleRun" type="hidden" value={isSingleTask ? "on" : ""} />
            <input name="recurrenceType" type="hidden" value={isSingleTask ? "single" : draft.recurrenceType} />
            <input name="interval" type="hidden" value={isSingleTask ? "1" : draft.interval || "1"} />
            <input name="assignmentMode" type="hidden" value={isSingleTask ? "fixed" : draft.assignmentMode} />
            {draft.eligibleMemberIds.map((memberId) => (
              <input key={memberId} name="eligibleMemberIds" type="hidden" value={memberId} />
            ))}

            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/72 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="section-kicker">Aperçu</p>
                  <h4 className="mt-2 text-lg font-semibold text-[var(--ink-950)]">
                    {draft.title.trim() || "Votre nouvelle tâche"}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">
                    {recurrenceLabel} · {draft.estimatedMinutes ? formatMinutes(Number(draft.estimatedMinutes) || 0) : "Durée à définir"} · {selectedAssignmentLabel}
                  </p>
                </div>
                <span className="stat-pill px-3 py-1 text-xs font-semibold">
                  {draft.room.trim() || "Pièce libre"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="stat-pill inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: draft.color }} />
                  {draft.category.trim() || "Sans catégorie"}
                </span>
                <span className="stat-pill px-3 py-1 text-xs font-semibold">
                  {selectedMembers.length || 0} membre{selectedMembers.length > 1 ? "s" : ""}
                </span>
                <span className="stat-pill px-3 py-1 text-xs font-semibold">
                  {draft.startsOn || "Date à définir"}
                </span>
              </div>
            </div>

            {step === 1 ? (
              <div className="compact-stack">
                <div className="field-label">
                  <span>Format</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      aria-pressed={isSingleTask}
                      className={cn(
                        "soft-panel group relative overflow-hidden px-4 py-3 text-left transition-all",
                        isSingleTask
                          ? "border-[var(--sky-500)] bg-[rgba(47,109,136,0.12)] shadow-sm"
                          : "hover:bg-white/50",
                      )}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          kind: "single",
                          assignmentMode: "fixed",
                          eligibleMemberIds: current.eligibleMemberIds[0]
                            ? [current.eligibleMemberIds[0]]
                            : members[0]
                              ? [members[0].id]
                              : [],
                        }))
                      }
                      type="button"
                    >
                      {isSingleTask && (
                        <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[var(--sky-500)] text-white shadow-sm">
                          <Check className="size-3" />
                        </div>
                      )}
                      <p className={cn("font-semibold transition-colors", isSingleTask && "text-[var(--sky-700)]")}>
                        Tâche simple
                      </p>
                      <p className="text-sm text-[var(--ink-700)]">Une seule date, une seule personne.</p>
                    </button>
                    <button
                      aria-pressed={!isSingleTask}
                      className={cn(
                        "soft-panel group relative overflow-hidden px-4 py-3 text-left transition-all",
                        !isSingleTask
                          ? "border-[var(--sky-500)] bg-[rgba(47,109,136,0.12)] shadow-sm"
                          : "hover:bg-white/50",
                      )}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          kind: "recurring",
                          assignmentMode:
                            current.assignmentMode === "fixed" && current.eligibleMemberIds.length <= 1
                              ? "strict_alternation"
                              : current.assignmentMode,
                          eligibleMemberIds:
                            current.eligibleMemberIds.length > 1
                              ? current.eligibleMemberIds
                              : members.map((member) => member.id),
                        }))
                      }
                      type="button"
                    >
                      {!isSingleTask && (
                        <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[var(--sky-500)] text-white shadow-sm">
                          <Check className="size-3" />
                        </div>
                      )}
                      <p className={cn("font-semibold transition-colors", !isSingleTask && "text-[var(--sky-700)]")}>
                        Tâche récurrente
                      </p>
                      <p className="text-sm text-[var(--ink-700)]">Revient automatiquement selon un rythme.</p>
                    </button>
                  </div>
                </div>
                <label className="field-label">
                  <span>Nom</span>
                  <input
                    autoFocus
                    className="field"
                    onChange={(event) => updateDraft("title", event.currentTarget.value)}
                    placeholder="Ex: Sortir les poubelles"
                    required
                    type="text"
                    value={draft.title}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field-label">
                    <span>Durée estimée</span>
                    <input
                      className="field"
                      inputMode="numeric"
                      min="1"
                      name="estimatedMinutesVisible"
                      onChange={(event) => updateDraft("estimatedMinutes", event.currentTarget.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      placeholder="Minutes"
                      required
                      type="number"
                      value={draft.estimatedMinutes}
                    />
                  </label>
                  <label className="field-label">
                    <span>Pièce</span>
                    <input
                      className="field"
                      list="room-suggestions"
                      onChange={(event) => updateDraft("room", event.currentTarget.value)}
                      placeholder="Ex: Cuisine"
                      type="text"
                      value={draft.room}
                    />
                  </label>
                </div>
                <datalist id="room-suggestions">
                  {roomSuggestions.map((room) => (
                    <option key={room} value={room} />
                  ))}
                </datalist>
                <label className="field-label">
                  <span>Catégorie</span>
                  <input
                    className="field"
                    onChange={(event) => updateDraft("category", event.currentTarget.value)}
                    placeholder="Ex: Nettoyage"
                    type="text"
                    value={draft.category}
                  />
                </label>
                <div className="field-label">
                  <span>Couleur</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      className="field h-[3.2rem] w-[4.5rem] px-2"
                      onChange={(event) => updateDraft("color", event.currentTarget.value)}
                      type="color"
                      value={draft.color}
                    />
                    <div className="flex flex-wrap gap-2">
                      {taskPalette.slice(0, 8).map((color) => (
                        <button
                          aria-label={`Choisir la couleur ${color}`}
                          className={cn(
                            "size-7 rounded-full border-2 transition-transform",
                            draft.color === color ? "scale-110 border-[var(--ink-950)]" : "border-black/10",
                          )}
                          key={color}
                          onClick={() => updateDraft("color", color)}
                          style={{ backgroundColor: color }}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="compact-stack">
                <label className="field-label">
                  <span>{isSingleTask ? "Date" : "Première date"}</span>
                  <input
                    className="field"
                    onChange={(event) => updateDraft("startsOn", event.currentTarget.value)}
                    required
                    type="date"
                    value={draft.startsOn}
                  />
                </label>
                {isSingleTask ? (
                  <div className="soft-panel px-4 py-4 text-sm leading-6 text-[var(--ink-700)]">
                    Une seule occurrence sera créée à cette date, puis la tâche disparaîtra naturellement du planning futur.
                  </div>
                ) : (
                  <>
                    <div className="field-label">
                      <span>Répétition</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {recurrenceOptions.map((option) => {
                          const Icon = option.icon;
                          const active = draft.recurrenceType === option.value;
                          return (
                            <button
                              aria-pressed={active}
                              className={cn(
                                "soft-panel group relative flex items-center gap-3 overflow-hidden px-4 py-3 text-left transition-all",
                                active ? "border-[var(--sky-500)] bg-[rgba(47,109,136,0.12)] shadow-sm" : "hover:bg-white/50",
                              )}
                              key={option.value}
                              onClick={() => updateDraft("recurrenceType", option.value)}
                              type="button"
                            >
                              <span
                                className={cn(
                                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                                  active ? "bg-[var(--sky-500)] text-white shadow-sm" : "bg-[rgba(47,109,136,0.12)] text-[var(--sky-600)]",
                                )}
                              >
                                <Icon className="size-4" />
                              </span>
                              <span className={cn("font-semibold transition-colors", active && "text-[var(--sky-700)]")}>
                                {option.label}
                              </span>
                              {active && (
                                <div className="absolute right-2 top-2">
                                  <Check className="size-3 text-[var(--sky-500)]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {everyXMode ? (
                      <label className="field-label">
                        <span>Valeur de X</span>
                        <input
                          className="field"
                          inputMode="numeric"
                          min="1"
                          onChange={(event) => updateDraft("interval", event.currentTarget.value)}
                          onFocus={(event) => event.currentTarget.select()}
                          required
                          type="number"
                          value={draft.interval}
                        />
                      </label>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="compact-stack">
                <div className="field-label">
                  <span>{isSingleTask ? "Personne assignée" : "Membres concernés"}</span>
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => {
                      const active = draft.eligibleMemberIds.includes(member.id);

                      return (
                        <button
                          aria-pressed={active}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                            active
                              ? "border-[var(--sky-500)] bg-[rgba(47,109,136,0.16)] text-[var(--sky-700)] shadow-[0_12px_24px_rgba(47,109,136,0.12)]"
                              : "border-[var(--line)] bg-white/70 text-[var(--ink-700)] hover:-translate-y-0.5 hover:border-[rgba(47,109,136,0.18)] hover:bg-white",
                          )}
                          key={member.id}
                          onClick={() => toggleMember(member.id)}
                          type="button"
                        >
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: member.color ?? "rgba(30,31,34,0.2)" }}
                          />
                          {member.displayName}
                          {active ? <Check className="size-4" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  {draft.eligibleMemberIds.length === 0 ? (
                    <span className="field-help">
                      {isSingleTask ? "Choisissez la personne qui doit faire cette tâche." : "Choisissez au moins une personne."}
                    </span>
                  ) : null}
                </div>
                {isSingleTask ? (
                  <div className="soft-panel px-4 py-4 text-sm leading-6 text-[var(--ink-700)]">
                    Attribution fixe automatique pour cette unique occurrence.
                  </div>
                ) : (
                  <div className="field-label">
                    <span>Attribution</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {assignmentOptions.map((option) => {
                        const active = draft.assignmentMode === option.value;
                        return (
                          <button
                            aria-pressed={active}
                            className={cn(
                              "soft-panel group relative overflow-hidden px-4 py-3 text-left transition-all",
                              active ? "border-[var(--sky-500)] bg-[rgba(47,109,136,0.12)] shadow-sm" : "hover:bg-white/50",
                            )}
                            key={option.value}
                            onClick={() => updateDraft("assignmentMode", option.value)}
                            type="button"
                          >
                            <p className={cn("font-semibold transition-colors", active && "text-[var(--sky-700)]")}>
                              {option.label}
                            </p>
                            <p className="text-sm text-[var(--ink-700)]">{option.hint}</p>
                            {active && (
                              <div className="absolute right-3 top-3 flex size-4 items-center justify-center rounded-full bg-[var(--sky-500)] text-white">
                                <Check className="size-2.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div
              className="sticky bottom-2 mt-2 flex flex-col gap-3 rounded-[1.4rem] border border-[var(--line)] bg-white/90 px-3 py-3 shadow-[var(--shadow-soft)] sm:static sm:flex-row sm:items-center sm:justify-between sm:border-none sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none"
              style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <p className="text-xs font-medium text-[var(--ink-500)] sm:hidden">
                {step < 3 ? "Continuez pour finaliser la tâche." : "Vérifiez puis créez la tâche."}
              </p>
              <button
                className="btn-quiet inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
                disabled={step === 1}
                onClick={() => {
                  setIsStep3Armed(false);
                  setStep((current) => Math.max(1, current - 1));
                }}
                type="button"
              >
                <ChevronLeft className="size-4" />
                Retour
              </button>

              {step < 3 ? (
                <button
                  className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold"
                  disabled={step === 1 && !draft.title.trim()}
                  onClick={() => {
                    setIsStep3Armed(false);
                    setStep((current) => Math.min(3, current + 1));
                  }}
                  type="button"
                >
                  Continuer
                  <ChevronRight className="size-4" />
                </button>
              ) : (
                <button
                  className="btn-primary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold disabled:opacity-50"
                  disabled={!isStep3Armed || !draft.title.trim() || draft.eligibleMemberIds.length === 0}
                  type="submit"
                >
                  {isSingleTask ? "Créer la tâche simple" : "Créer la tâche"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
