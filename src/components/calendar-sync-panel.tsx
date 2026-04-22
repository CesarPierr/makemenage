"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

type CalendarSyncPanelProps = {
  householdFeedUrl: string;
  personalFeedUrl?: string | null;
};

type CopyState = "idle" | "copied";

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function CopyFeedButton({ label, value }: { label: string; value: string }) {
  const [state, setState] = useState<CopyState>("idle");

  return (
    <button
      className="btn-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
      onClick={async () => {
        await copyText(value);
        setState("copied");
        window.setTimeout(() => setState("idle"), 1800);
      }}
      type="button"
    >
      {state === "copied" ? <Check className="size-4" /> : <Copy className="size-4" />}
      {state === "copied" ? `${label} copiée` : label}
    </button>
  );
}

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

      <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">
        Le plus simple est d’abonner Google Calendar a l’URL iCal du foyer. Google demande de le faire
        depuis un navigateur web sur ordinateur, puis le calendrier apparaît aussi sur mobile.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <CopyFeedButton label="Copier l’URL iCal du foyer" value={householdFeedUrl} />
        {personalFeedUrl ? (
          <CopyFeedButton label="Copier l’URL iCal personnelle" value={personalFeedUrl} />
        ) : null}
      </div>

      <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--ink-700)]">
        <p>Étapes : Google Calendar &gt; Autres agendas &gt; Ajouter un agenda &gt; Depuis l’URL.</p>
        <p>Le flux du foyer est public sur votre instance locale, donc idéal pour un abonnement simple.</p>
      </div>
    </div>
  );
}
