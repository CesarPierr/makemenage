"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Plus, TimerReset } from "lucide-react";

import { taskPalette } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TaskCreationWizardProps = {
  householdId: string;
  members: { id: string; displayName: string; color?: string }[];
};

type DraftTask = {
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

  const everyXMode = draft.recurrenceType === "every_x_days" || draft.recurrenceType === "every_x_weeks";

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
            <p className="mt-1 text-sm text-[var(--ink-700)]">Une saisie courte, puis réglages essentiels.</p>
          </div>
        </button>
      ) : (
        <div className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Étape {step} / 3</p>
              <h3 className="display-title mt-1 text-2xl">
                {step === 1 ? "La tâche" : step === 2 ? "Le rythme" : "L’attribution"}
              </h3>
            </div>
            <button className="btn-quiet px-4 py-2 text-sm font-semibold" onClick={resetWizard} type="button">
              Fermer
            </button>
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
            <input name="recurrenceType" type="hidden" value={draft.recurrenceType} />
            <input name="interval" type="hidden" value={draft.interval || "1"} />
            <input name="assignmentMode" type="hidden" value={draft.assignmentMode} />
            {draft.eligibleMemberIds.map((memberId) => (
              <input key={memberId} name="eligibleMemberIds" type="hidden" value={memberId} />
            ))}

            {step === 1 ? (
              <div className="compact-stack">
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
                      onChange={(event) => updateDraft("room", event.currentTarget.value)}
                      placeholder="Ex: Cuisine"
                      type="text"
                      value={draft.room}
                    />
                  </label>
                </div>
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
                  <span>Première date</span>
                  <input
                    className="field"
                    onChange={(event) => updateDraft("startsOn", event.currentTarget.value)}
                    required
                    type="date"
                    value={draft.startsOn}
                  />
                </label>
                <div className="field-label">
                  <span>Répétition</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {recurrenceOptions.map((option) => {
                      const Icon = option.icon;

                      return (
                        <button
                          className={cn(
                            "soft-panel flex items-center gap-3 px-4 py-3 text-left",
                            draft.recurrenceType === option.value && "border-[rgba(47,109,136,0.28)] bg-white",
                          )}
                          key={option.value}
                          onClick={() => updateDraft("recurrenceType", option.value)}
                          type="button"
                        >
                          <span className="flex size-9 items-center justify-center rounded-full bg-[rgba(47,109,136,0.12)] text-[var(--sky-600)]">
                            <Icon className="size-4" />
                          </span>
                          <span className="font-semibold">{option.label}</span>
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
              </div>
            ) : null}

            {step === 3 ? (
              <div className="compact-stack">
                <div className="field-label">
                  <span>Membres concernés</span>
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => {
                      const active = draft.eligibleMemberIds.includes(member.id);

                      return (
                        <button
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                            active
                              ? "border-[var(--sky-500)] bg-[rgba(47,109,136,0.12)] text-[var(--sky-600)]"
                              : "border-[var(--line)] bg-white/70 text-[var(--ink-700)]",
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
                    <span className="field-help">Choisissez au moins une personne.</span>
                  ) : null}
                </div>
                <div className="field-label">
                  <span>Attribution</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {assignmentOptions.map((option) => (
                      <button
                        className={cn(
                          "soft-panel px-4 py-3 text-left",
                          draft.assignmentMode === option.value && "border-[rgba(47,109,136,0.28)] bg-white",
                        )}
                        key={option.value}
                        onClick={() => updateDraft("assignmentMode", option.value)}
                        type="button"
                      >
                        <p className="font-semibold">{option.label}</p>
                        <p className="text-sm text-[var(--ink-700)]">{option.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                className="btn-quiet inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
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
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
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
                  className="btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                  disabled={!isStep3Armed || !draft.title.trim() || draft.eligibleMemberIds.length === 0}
                  type="submit"
                >
                  Créer la tâche
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
