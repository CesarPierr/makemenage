"use client";

import { ExternalLink } from "lucide-react";

import { CopyValueButton } from "@/components/copy-value-button";

type CalendarSyncPanelProps = {
  householdFeedUrl: string;
  personalFeedUrl?: string | null;
};

export function CalendarSyncPanel({
  householdFeedUrl,
  personalFeedUrl,
}: CalendarSyncPanelProps) {
  return (
    <div className="soft-panel p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Synchronisation</p>
          <h3 className="display-title mt-2 text-2xl">Google Calendar et iCal</h3>
        </div>
        <a
          className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
          href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
          rel="noreferrer"
          target="_blank"
        >
          Ouvrir Google Calendar
          <ExternalLink className="size-4" />
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <CopyValueButton label="Copier l’URL iCal du foyer" value={householdFeedUrl} />
        {personalFeedUrl ? (
          <CopyValueButton label="Copier l’URL iCal personnelle" value={personalFeedUrl} />
        ) : null}
      </div>

      <p className="mt-4 text-sm text-[var(--ink-700)]">
        Google Calendar &gt; Autres agendas &gt; Depuis l’URL.
      </p>
    </div>
  );
}
