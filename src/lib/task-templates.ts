export type TaskTemplatePack = {
  id: string;
  label: string;
  description: string;
  tasks: TaskTemplatePreset[];
};

export type TaskTemplatePreset = {
  title: string;
  room: string;
  estimatedMinutes: number;
  recurrenceType: "daily" | "weekly" | "every_x_days";
  recurrenceInterval: number;
  emoji: string;
};

export const TASK_TEMPLATE_PACKS: TaskTemplatePack[] = [
  {
    id: "couple",
    label: "Couple",
    description: "L'essentiel pour un appartement à deux",
    tasks: [
      { title: "Vaisselle", room: "Cuisine", estimatedMinutes: 10, recurrenceType: "daily", recurrenceInterval: 1, emoji: "🍽️" },
      { title: "Aspirateur salon", room: "Salon", estimatedMinutes: 15, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "🧹" },
      { title: "Nettoyage cuisine", room: "Cuisine", estimatedMinutes: 20, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "🧽" },
      { title: "Poubelles", room: "Cuisine", estimatedMinutes: 5, recurrenceType: "every_x_days", recurrenceInterval: 3, emoji: "🗑️" },
      { title: "Salle de bain", room: "Salle de bain", estimatedMinutes: 20, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "🚿" },
      { title: "Lessive", room: "Buanderie", estimatedMinutes: 10, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "👕" },
    ],
  },
  {
    id: "coloc",
    label: "Coloc 3+",
    description: "Répartition équitable pour plusieurs personnes",
    tasks: [
      { title: "Vaisselle commune", room: "Cuisine", estimatedMinutes: 15, recurrenceType: "daily", recurrenceInterval: 1, emoji: "🍽️" },
      { title: "Aspirateur couloir + salon", room: "Couloir", estimatedMinutes: 20, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "🧹" },
      { title: "Nettoyage cuisine", room: "Cuisine", estimatedMinutes: 25, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "🧽" },
      { title: "Poubelles", room: "Cuisine", estimatedMinutes: 5, recurrenceType: "every_x_days", recurrenceInterval: 2, emoji: "🗑️" },
      { title: "Salle de bain commune", room: "Salle de bain", estimatedMinutes: 25, recurrenceType: "every_x_days", recurrenceInterval: 4, emoji: "🚿" },
      { title: "WC", room: "WC", estimatedMinutes: 10, recurrenceType: "every_x_days", recurrenceInterval: 3, emoji: "🪠" },
      { title: "Courses communes", room: "Tout", estimatedMinutes: 45, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "🛒" },
    ],
  },
  {
    id: "famille",
    label: "Famille",
    description: "Pour un foyer avec enfants",
    tasks: [
      { title: "Vaisselle", room: "Cuisine", estimatedMinutes: 15, recurrenceType: "daily", recurrenceInterval: 1, emoji: "🍽️" },
      { title: "Rangement jouets", room: "Salon", estimatedMinutes: 10, recurrenceType: "daily", recurrenceInterval: 1, emoji: "🧸" },
      { title: "Aspirateur", room: "Salon", estimatedMinutes: 20, recurrenceType: "every_x_days", recurrenceInterval: 2, emoji: "🧹" },
      { title: "Nettoyage cuisine", room: "Cuisine", estimatedMinutes: 25, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "🧽" },
      { title: "Poubelles", room: "Cuisine", estimatedMinutes: 5, recurrenceType: "every_x_days", recurrenceInterval: 2, emoji: "🗑️" },
      { title: "Salle de bain", room: "Salle de bain", estimatedMinutes: 20, recurrenceType: "every_x_days", recurrenceInterval: 3, emoji: "🚿" },
      { title: "Lessive enfants", room: "Buanderie", estimatedMinutes: 10, recurrenceType: "every_x_days", recurrenceInterval: 3, emoji: "👕" },
      { title: "Courses hebdo", room: "Tout", estimatedMinutes: 60, recurrenceType: "weekly", recurrenceInterval: 1, emoji: "🛒" },
    ],
  },
  {
    id: "saisonnier",
    label: "Saisonnier",
    description: "Tâches mensuelles et de fond",
    tasks: [
      { title: "Nettoyage vitres", room: "Salon", estimatedMinutes: 30, recurrenceType: "every_x_days", recurrenceInterval: 30, emoji: "🪟" },
      { title: "Nettoyage frigo", room: "Cuisine", estimatedMinutes: 20, recurrenceType: "every_x_days", recurrenceInterval: 30, emoji: "🧊" },
      { title: "Entretien four", room: "Cuisine", estimatedMinutes: 30, recurrenceType: "every_x_days", recurrenceInterval: 60, emoji: "🔥" },
      { title: "Dépoussiérage radiateurs", room: "Tout", estimatedMinutes: 20, recurrenceType: "every_x_days", recurrenceInterval: 90, emoji: "🌡️" },
      { title: "Nettoyage hotte", room: "Cuisine", estimatedMinutes: 25, recurrenceType: "every_x_days", recurrenceInterval: 60, emoji: "💨" },
    ],
  },
];
