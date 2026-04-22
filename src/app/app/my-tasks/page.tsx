import { startOfDay } from "date-fns";
import dynamic from "next/dynamic";
import { CollapsibleList } from "@/components/collapsible-list";
import { OccurrenceCard } from "@/components/occurrence-card";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";
import { cn } from "@/lib/utils";
const TaskCreationWizard = dynamic(
  () => import("@/components/task-creation-wizard").then((module) => module.TaskCreationWizard),
  {
    loading: () => <div className="soft-panel p-4 text-sm text-[var(--ink-700)]">Chargement du formulaire…</div>,
  },
);
const TaskSettingsList = dynamic(
  () => import("@/components/task-settings-list").then((module) => module.TaskSettingsList),
  {
    loading: () => <div className="soft-panel p-4 text-sm text-[var(--ink-700)]">Chargement des récurrences…</div>,
  },
);
const CompletedTasksDialog = dynamic(
  () => import("@/components/completed-tasks-dialog").then((module) => module.CompletedTasksDialog),
);

type MyTasksPageProps = {
  searchParams: Promise<{ 
    household?: string;
    tab?: "daily" | "templates" | "wizard";
  }>;
};

export default async function MyTasksPage({ searchParams }: MyTasksPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const activeTab = params.tab ?? "daily";
  const context = await requireHouseholdContext(user.id, params.household);
  const manageable = canManageHousehold(context.membership.role);

  const today = startOfDay(new Date());
  
  const myOccurrences = context.currentMember
    ? context.occurrences.filter((occurrence) => occurrence.assignedMemberId === context.currentMember?.id)
    : [];
    
  const todayAndOverdueAssigned = myOccurrences.filter((occurrence) =>
    ["due", "overdue", "rescheduled"].includes(occurrence.status) || 
    (occurrence.status === "planned" && startOfDay(occurrence.scheduledDate) <= today)
  );
  
  const futureAssigned = myOccurrences.filter((occurrence) =>
    occurrence.status === "planned" && startOfDay(occurrence.scheduledDate) > today
  );
  
  const closedAssigned = myOccurrences.filter((occurrence) =>
    ["completed", "skipped", "cancelled"].includes(occurrence.status),
  );
  const manualFutureOverrides =
    manageable && context.tasks.length
      ? await db.taskOccurrence.findMany({
          where: {
            householdId: context.household.id,
            taskTemplateId: {
              in: context.tasks.map((task) => task.id),
            },
            status: {
              in: ["planned", "due", "overdue", "rescheduled"],
            },
            scheduledDate: {
              gte: today,
            },
            isManuallyModified: true,
          },
          select: {
            taskTemplateId: true,
          },
        })
      : [];
  const manualOverridesByTaskId = manualFutureOverrides.reduce<Record<string, number>>((acc, occurrence) => {
    acc[occurrence.taskTemplateId] = (acc[occurrence.taskTemplateId] ?? 0) + 1;
    return acc;
  }, {});

  const tabBaseHref = (tab?: string) => {
    const p = new URLSearchParams();
    if (params.household) p.set("household", params.household);
    if (tab) p.set("tab", tab);
    return `/app/my-tasks?${p.toString()}`;
  };

  return (
    <section className="space-y-6">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Tâches</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">
          {manageable ? "Gestion du foyer" : "Mes tâches du foyer"}
        </h2>
        
        <div className="mt-5 flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Link
            href={tabBaseHref("daily")}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
              activeTab === "daily"
                ? "bg-white text-[var(--ink-950)] border-2 border-[var(--ink-950)] shadow-lg scale-105"
                : "bg-white/80 border border-[var(--line)] text-[var(--ink-700)] hover:bg-white"
            )}
          >
            Ma journée
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[0.6rem] font-bold",
              activeTab === "daily" ? "bg-[var(--ink-950)] text-white" : "bg-[var(--line)] text-[var(--ink-950)]"
            )}>
              {todayAndOverdueAssigned.length}
            </span>
          </Link>

          {manageable && (
            <>
              <Link
                href={tabBaseHref("templates")}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                  activeTab === "templates"
                    ? "bg-white text-[var(--ink-950)] border-2 border-[var(--ink-950)] shadow-lg scale-105"
                    : "bg-white/80 border border-[var(--line)] text-[var(--ink-700)] hover:bg-white"
                )}
              >
                Récurrences
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[0.6rem] font-bold",
                  activeTab === "templates" ? "bg-[var(--ink-950)] text-white" : "bg-[var(--line)] text-[var(--ink-950)]"
                )}>
                  {context.tasks.length}
                </span>
              </Link>
              <Link
                href={tabBaseHref("wizard")}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                  activeTab === "wizard"
                    ? "bg-white text-[var(--ink-950)] border-2 border-[var(--ink-950)] shadow-lg scale-105"
                    : "bg-white/80 border border-[var(--line)] text-[var(--ink-700)] hover:bg-white"
                )}
              >
                Nouveau
              </Link>
            </>
          )}
        </div>
      </div>

      {activeTab === "daily" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="app-surface rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Priorités</p>
                <h3 className="display-title mt-2 text-3xl">À faire aujourd&apos;hui</h3>
              </div>
            </div>
            <div className="mt-5">
              {todayAndOverdueAssigned.length ? (
                <div className="space-y-4">
                  {todayAndOverdueAssigned.map((occurrence) => (
                    <OccurrenceCard
                      key={occurrence.id}
                      occurrence={occurrence}
                      members={context.household.members}
                      currentMemberId={context.currentMember?.id}
                      returnTo={tabBaseHref("daily")}
                    />
                  ))}
                </div>
              ) : (
                <div className="soft-panel py-8 text-center text-[var(--ink-700)]">
                  C&apos;est tout pour aujourd&apos;hui ! 🎉
                </div>
              )}
            </div>
          </section>

          {futureAssigned.length > 0 && (
            <section className="app-surface rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Prochainement</p>
                  <h3 className="display-title mt-2 text-3xl">Tâches à venir</h3>
                </div>
              </div>
              <div className="mt-5">
                <CollapsibleList
                  initialCount={3}
                  items={futureAssigned.map((occurrence) => (
                    <OccurrenceCard
                      key={occurrence.id}
                      occurrence={occurrence}
                      members={context.household.members}
                      currentMemberId={context.currentMember?.id}
                      returnTo={tabBaseHref("daily")}
                    />
                  ))}
                />
              </div>
            </section>
          )}

          {closedAssigned.length ? (
            <section className="app-surface rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Récemment</p>
                  <h3 className="display-title mt-2 text-2xl">Actions clôturées</h3>
                </div>
              </div>
              <div className="mt-5">
                <CompletedTasksDialog 
                  tasks={closedAssigned}
                  members={context.household.members}
                  currentMemberId={context.currentMember?.id}
                />
              </div>
            </section>
          ) : null}
        </div>
      )}

      {activeTab === "templates" && manageable && (
        <section className="app-surface rounded-[2rem] p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Récurrences</p>
              <h3 className="display-title mt-2 text-3xl">Gérer le catalogue</h3>
            </div>
          </div>
          <div className="mt-6">
            <TaskSettingsList
              tasks={context.tasks}
              householdId={context.household.id}
              manualOverridesByTaskId={manualOverridesByTaskId}
            />
          </div>
        </section>
      )}

      {activeTab === "wizard" && manageable && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TaskCreationWizard
            householdId={context.household.id}
            members={context.household.members.map((member) => ({
              id: member.id,
              displayName: member.displayName,
              color: member.color,
            }))}
          />
        </section>
      )}
    </section>
  );
}
