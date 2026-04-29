import { requireUser } from "@/lib/auth";
import { requireHouseholdContext } from "@/lib/households";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = { searchParams: Promise<{ household?: string }> };

export default async function NotificationsSettingsPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);

  return (
    <section className="space-y-6">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Préférences</p>
        <h2 className="display-title mt-2 text-3xl leading-tight">Notifications</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-700)]">
          Recevez des rappels sur vos appareils pour ne jamais manquer une tâche.
        </p>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--ink-950)]">Apparence</p>
            <ThemeToggle />
          </div>
          <div className="soft-divider" />
          <PushNotificationToggle memberId={context.currentMember?.id ?? ""} />

          <div className="soft-panel p-4">
            <h3 className="text-sm font-semibold">Quand vous serez notifié(e)</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ink-700)]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-1.5 rounded-full bg-[var(--coral-500)] shrink-0 translate-y-1" />
                Tâches du jour non validées à 18h
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-1.5 rounded-full bg-[var(--coral-500)] shrink-0 translate-y-1" />
                Rappel des tâches en retard chaque matin
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-1.5 rounded-full bg-[var(--coral-500)] shrink-0 translate-y-1" />
                Nouvelle tâche assignée à votre compte
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-1.5 rounded-full bg-[var(--coral-500)] shrink-0 translate-y-1" />
                Versement automatique ou objectif d&apos;épargne atteint
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
