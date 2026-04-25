"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  House,
  ListChecks,
  Shuffle,
  Sparkles,
  Users,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { isoDateKey } from "@/lib/time";

type OnboardingWizardProps = {
  householdId: string;
  householdName: string;
  currentMemberName: string;
};

const SUGGESTED_TASKS = [
  { title: "Aspirateur salon", room: "Salon", estimatedMinutes: 15, emoji: "🧹", recurrenceLabel: "Hebdo" },
  { title: "Vaisselle", room: "Cuisine", estimatedMinutes: 10, emoji: "🍽️", recurrenceLabel: "Quotidien" },
  { title: "Poubelles", room: "Cuisine", estimatedMinutes: 5, emoji: "🗑️", recurrenceLabel: "Hebdo" },
  { title: "Nettoyage salle de bain", room: "Salle de bain", estimatedMinutes: 20, emoji: "🚿", recurrenceLabel: "Hebdo" },
  { title: "Lessive", room: "Buanderie", estimatedMinutes: 10, emoji: "👕", recurrenceLabel: "Hebdo" },
  { title: "Courses", room: "Tout l'appartement", estimatedMinutes: 45, emoji: "🛒", recurrenceLabel: "Hebdo" },
] as const;

type PackId = "couple" | "coloc" | "famille" | "custom";

const PACKS: Array<{ id: PackId; emoji: string; label: string; desc: string; taskIndices: number[] }> = [
  {
    id: "couple",
    emoji: "💑",
    label: "Couple",
    desc: "L'essentiel pour 2 personnes",
    taskIndices: [0, 1, 2],
  },
  {
    id: "coloc",
    emoji: "🏠",
    label: "Coloc",
    desc: "Rotation pour 3 personnes et plus",
    taskIndices: [0, 1, 2, 3, 4],
  },
  {
    id: "famille",
    emoji: "👨‍👩‍👧",
    label: "Famille",
    desc: "Toutes les tâches du foyer",
    taskIndices: [0, 1, 2, 3, 4, 5],
  },
  {
    id: "custom",
    emoji: "✏️",
    label: "Personnalisé",
    desc: "Je choisis moi-même",
    taskIndices: [],
  },
];

const STEPS = [
  { id: "welcome", label: "Bienvenue" },
  { id: "pack", label: "Profil" },
  { id: "tasks", label: "Tâches" },
  { id: "invite", label: "Équipe" },
  { id: "done", label: "C'est parti !" },
] as const;

type Step = (typeof STEPS)[number]["id"];

export function OnboardingWizard({ householdId, householdName, currentMemberName }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set([0, 1, 2]));
  const [isCreating, setIsCreating] = useState(false);
  const { success, error: showError } = useToast();

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  function selectPack(pack: (typeof PACKS)[number]) {
    if (pack.id === "custom") {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(pack.taskIndices));
    }
    setStep("tasks");
  }

  async function createSelectedTasks() {
    setIsCreating(true);
    const tasksToCreate = [...selectedTasks].map((i) => SUGGESTED_TASKS[i]);
    const startsOn = isoDateKey(new Date());

    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/);
      const csrfHeaders: HeadersInit = csrfMatch?.[1] ? { "x-csrf-token": csrfMatch[1] } : {};

      // Create suggested tasks one by one so each sync completes before the next
      // request generates occurrences. Parallel writes race on sourceGenerationKey.
      for (const task of tasksToCreate) {
        const formData = new FormData();
        formData.set("householdId", householdId);
        formData.set("title", task.title);
        formData.set("room", task.room);
        formData.set("estimatedMinutes", String(task.estimatedMinutes));
        formData.set("startsOn", startsOn);
        formData.set("interval", "1");
        formData.set("recurrenceType", "weekly");
        formData.set("assignmentMode", "round_robin");
        formData.set("priority", "2");

        const response = await fetch(`/api/tasks`, { method: "POST", body: formData, headers: csrfHeaders });
        if (!response.ok) {
          throw new Error("task-create-failed");
        }
      }
      success(`${tasksToCreate.length} tâches créées !`);
      setStep("invite");
    } catch {
      showError("Erreur lors de la création des tâches.");
    } finally {
      setIsCreating(false);
    }
  }

  function toggleTask(index: number) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress bar */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                i <= currentStepIndex ? "bg-[var(--coral-500)]" : "bg-black/10"
              }`}
            />
            <span className={`text-[0.6rem] font-bold uppercase tracking-wider ${
              i <= currentStepIndex ? "text-[var(--coral-600)]" : "text-[var(--ink-400)]"
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step: Welcome */}
      {step === "welcome" && (
        <div className="app-surface rounded-[2rem] p-6 sm:p-8 text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-[rgba(216,100,61,0.12)] text-[var(--coral-600)]">
            <House className="size-10" />
          </div>
          <h2 className="display-title text-3xl sm:text-4xl">
            Bienvenue dans<br />{householdName} !
          </h2>
          <p className="mt-4 text-[var(--ink-700)] leading-7">
            Bonjour <strong>{currentMemberName}</strong> ! MakeMenage va vous aider à répartir les tâches ménagères
            de façon équitable et automatique. Configurons l&apos;essentiel en 2 minutes.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: ListChecks, label: "Tâches récurrentes", desc: "Planifiées automatiquement" },
              { icon: Shuffle, label: "Rotation juste", desc: "Alternance équitable" },
              { icon: CalendarDays, label: "Vue calendrier", desc: "Qui fait quoi et quand" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="soft-panel p-4 text-center">
                <Icon className="mx-auto size-6 text-[var(--coral-500)] mb-2" />
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-[var(--ink-500)] mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
          <button
            className="btn-primary mt-8 inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold"
            onClick={() => setStep("pack")}
            type="button"
          >
            C&apos;est parti <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {/* Step: Pack */}
      {step === "pack" && (
        <div className="app-surface rounded-[2rem] p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[rgba(56,115,93,0.12)] text-[var(--leaf-600)]">
              <Users className="size-7" />
            </div>
            <h2 className="display-title text-2xl sm:text-3xl">Quel type de foyer ?</h2>
            <p className="mt-2 text-sm text-[var(--ink-700)]">
              On va pré-sélectionner les tâches adaptées. Vous pourrez les ajuster à l&apos;étape suivante.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {PACKS.map((pack) => (
              <button
                key={pack.id}
                className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-white/60 p-4 text-left transition-all hover:border-[var(--coral-400)] hover:bg-[rgba(216,100,61,0.04)] hover:shadow-sm active:scale-[0.98]"
                onClick={() => selectPack(pack)}
                type="button"
              >
                <span className="text-3xl leading-none">{pack.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--ink-950)]">{pack.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-500)]">{pack.desc}</p>
                </div>
                <ChevronRight className="ml-auto size-4 shrink-0 text-[var(--ink-400)]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Tasks */}
      {step === "tasks" && (
        <div className="app-surface rounded-[2rem] p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[rgba(216,100,61,0.12)] text-[var(--coral-600)]">
              <ListChecks className="size-7" />
            </div>
            <h2 className="display-title text-2xl sm:text-3xl">Choisissez vos tâches</h2>
            <p className="mt-2 text-sm text-[var(--ink-700)]">
              Sélectionnez les tâches à ajouter à votre foyer. Vous pourrez en créer d&apos;autres ensuite.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTED_TASKS.map((task, i) => {
              const selected = selectedTasks.has(i);
              return (
                <button
                  key={task.title}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                    selected
                      ? "border-[var(--coral-500)] bg-[rgba(216,100,61,0.08)] text-[var(--ink-950)]"
                      : "border-[var(--line)] bg-white/60 text-[var(--ink-700)] hover:border-[var(--ink-300)] hover:bg-white"
                  }`}
                  onClick={() => toggleTask(i)}
                  type="button"
                >
                  <span className="text-xl">{task.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight">{task.title}</p>
                    <p className="text-[0.7rem] text-[var(--ink-500)]">{task.room} · {task.estimatedMinutes} min · {task.recurrenceLabel}</p>
                  </div>
                  <div className={`size-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    selected ? "border-[var(--coral-500)] bg-[var(--coral-500)]" : "border-[var(--line)]"
                  }`}>
                    {selected && <CheckCircle2 className="size-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              className="btn-quiet flex-1 px-4 py-3 text-sm font-semibold"
              onClick={() => setStep("invite")}
              type="button"
            >
              Passer cette étape
            </button>
            <button
              className="btn-primary flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold disabled:opacity-50"
              disabled={selectedTasks.size === 0 || isCreating}
              onClick={createSelectedTasks}
              type="button"
            >
              {isCreating ? "Création…" : `Ajouter ${selectedTasks.size} tâche${selectedTasks.size > 1 ? "s" : ""}`}
              {!isCreating && <ArrowRight className="size-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Step: Invite */}
      {step === "invite" && (
        <div className="app-surface rounded-[2rem] p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[rgba(47,109,136,0.12)] text-[var(--sky-600)]">
              <Users className="size-7" />
            </div>
            <h2 className="display-title text-2xl sm:text-3xl">Invitez votre équipe</h2>
            <p className="mt-2 text-sm text-[var(--ink-700)]">
              MakeMenage fonctionne mieux à plusieurs. Partagez le lien d&apos;accès avec les membres de votre foyer.
            </p>
          </div>

          <form action={`/api/households/${householdId}/invites`} method="post" className="soft-panel p-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const headers: Record<string, string> = {};
              const csrfMatch = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/);
              if (csrfMatch?.[1]) headers["x-csrf-token"] = csrfMatch[1];
              const res = await fetch(`/api/households/${householdId}/invites`, { method: "POST", body: formData, headers });
              if (res.redirected) {
                window.location.href = res.url;
              } else if (res.ok) {
                window.location.reload();
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field-label">
                <span>Rôle</span>
                <select className="field" name="role" defaultValue="member">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="field-label">
                <span>Expire dans (jours)</span>
                <input className="field" type="number" name="expiresInDays" defaultValue="7" min="1" max="30" />
              </label>
            </div>
            <button className="btn-primary w-full px-4 py-3 text-sm font-bold" type="submit">
              Générer un lien d&apos;invitation
            </button>
          </form>

          <button
            className="btn-quiet w-full px-4 py-3 text-sm font-semibold"
            onClick={() => setStep("done")}
            type="button"
          >
            Je ferai ça plus tard <ChevronRight className="inline size-4" />
          </button>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="app-surface rounded-[2rem] p-6 sm:p-8 text-center space-y-5">
          <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-[rgba(56,115,93,0.12)] text-[var(--leaf-600)]">
            <Sparkles className="size-10" />
          </div>
          <h2 className="display-title text-3xl sm:text-4xl">Tout est prêt !</h2>
          <p className="text-[var(--ink-700)] leading-7">
            Votre foyer est configuré. Les tâches seront planifiées automatiquement selon les règles de rotation choisies.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold"
              href={`/app?household=${householdId}&start=session`}
            >
              Lancer ma première session <ArrowRight className="size-4" />
            </a>
            <a
              className="btn-secondary inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold"
              href={`/app?household=${householdId}`}
            >
              Aller au tableau de bord
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
