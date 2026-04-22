import type { OccurrenceActionType } from "@prisma/client";

type HistoryLogInput = {
  actionType: OccurrenceActionType;
  actorMember?: { displayName: string } | null;
  newValues?: unknown;
};

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getHistoryActionLabel(actionType: OccurrenceActionType) {
  switch (actionType) {
    case "completed":
      return "Terminée";
    case "skipped":
      return "Sautée";
    case "rescheduled":
      return "Reportée";
    case "reassigned":
      return "Réattribuée";
    case "created":
      return "Planifiée";
    case "assigned":
      return "Attribuée";
    case "edited":
      return "Modifiée";
    case "cancelled":
      return "Annulée";
    default:
      return actionType;
  }
}

export function getHistoryActionDescription(log: HistoryLogInput) {
  const values = readObject(log.newValues);

  switch (log.actionType) {
    case "completed":
      return `Validée par ${log.actorMember?.displayName ?? "le système"}.`;
    case "skipped":
      return `Ignorée par ${log.actorMember?.displayName ?? "le système"}.`;
    case "rescheduled": {
      const scheduledDate = typeof values.scheduledDate === "string" ? values.scheduledDate.slice(0, 10) : null;

      return scheduledDate
        ? `Déplacée au ${scheduledDate} par ${log.actorMember?.displayName ?? "le système"}.`
        : `Date modifiée par ${log.actorMember?.displayName ?? "le système"}.`;
    }
    case "reassigned":
      return `Attribution changée par ${log.actorMember?.displayName ?? "le système"}.`;
    case "created":
      return "Occurrence générée automatiquement par le planning.";
    case "cancelled":
      return "Occurrence retirée du planning.";
    case "edited":
      return `Détails mis à jour par ${log.actorMember?.displayName ?? "le système"}.`;
    case "assigned":
      return "Attribution ajustée automatiquement.";
    default:
      return `Action enregistrée par ${log.actorMember?.displayName ?? "le système"}.`;
  }
}
