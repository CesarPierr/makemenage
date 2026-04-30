// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { render } from "../test-utils";
import { SettingsTabs } from "@/components/settings/settings-tabs";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => <a href={href as string} {...props}>{children as React.ReactNode}</a>,
}));

const allPanels = [
  { id: "households" as const, label: "Foyers", description: "Gérer vos foyers" },
  { id: "team" as const, label: "Équipe", description: "Membres du foyer" },
  { id: "tasks" as const, label: "Tâches", description: "Configuration des tâches" },
  { id: "access" as const, label: "Accès", description: "Invitations et accès" },
  { id: "planning" as const, label: "Planification", description: "Paramètres de planification" },
  { id: "holidays" as const, label: "Vacances", description: "Gérer les absences" },
  { id: "integrations" as const, label: "Intégrations", description: "Services externes" },
  { id: "danger" as const, label: "Danger", description: "Zone dangereuse" },
  { id: "activity" as const, label: "Activité", description: "Historique" },
  { id: "notifications" as const, label: "Notifications", description: "Préférences de notification" },
];

describe("SettingsTabs", () => {
  test("renders all panel labels", () => {
    render(<SettingsTabs panels={allPanels} householdId="hh_1" />);
    for (const p of allPanels) expect(screen.getByText(p.label)).toBeInTheDocument();
  });

  test("separates panels into Foyer and Moi sections", () => {
    render(<SettingsTabs panels={allPanels} householdId="hh_1" />);
    expect(screen.getByText("Foyer")).toBeInTheDocument();
    expect(screen.getByText("Moi")).toBeInTheDocument();
  });

  test("renders links with correct href including householdId", () => {
    render(<SettingsTabs panels={allPanels} householdId="hh_42" />);
    const teamLink = screen.getByText("Équipe").closest("a");
    expect(teamLink).toHaveAttribute("href", "/app/settings/team?household=hh_42");
  });

  test("renders navigation landmark", () => {
    render(<SettingsTabs panels={allPanels} householdId="hh_1" />);
    expect(screen.getByRole("navigation", { name: "Sections des réglages" })).toBeInTheDocument();
  });

  test("renders with subset of panels", () => {
    const subset = allPanels.slice(0, 3);
    render(<SettingsTabs panels={subset} householdId="hh_1" />);
    expect(screen.getByText("Foyers")).toBeInTheDocument();
    expect(screen.queryByText("Danger")).not.toBeInTheDocument();
  });
});
