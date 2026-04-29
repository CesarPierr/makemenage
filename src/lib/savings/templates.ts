import type { SavingsBoxKind } from "@prisma/client";

export type SavingsBoxTemplate = {
  name: string;
  kind: SavingsBoxKind;
  icon: string;
  color: string;
  notes: string;
  suggestedMonthlyAmount?: number;
};

export const savingsBoxTemplates: SavingsBoxTemplate[] = [
  {
    name: "Épargne précaution",
    kind: "savings",
    icon: "Shield",
    color: "#3F7E66",
    notes: "Réserve pour les imprévus (3 à 6 mois de dépenses).",
    suggestedMonthlyAmount: 100,
  },
  {
    name: "Vacances",
    kind: "project",
    icon: "Plane",
    color: "#2E6D88",
    notes: "On met de côté pour les prochaines vacances.",
    suggestedMonthlyAmount: 80,
  },
  {
    name: "Voiture",
    kind: "project",
    icon: "Car",
    color: "#C56A3A",
    notes: "Entretien, réparations ou prochain achat.",
    suggestedMonthlyAmount: 50,
  },
  {
    name: "Imprévus du foyer",
    kind: "provision",
    icon: "Wrench",
    color: "#6B5A92",
    notes: "Petites dépenses inattendues (électroménager, frais médicaux…).",
    suggestedMonthlyAmount: 40,
  },
];
