// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render } from "../test-utils";
import { OccurrenceCard } from "@/components/tasks/occurrence-card";

// Mock TaskDetailSheet to avoid rendering a complex nested component
vi.mock("@/components/tasks/task-detail-sheet", () => ({
  TaskDetailSheet: () => null,
}));

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }),
  );
  Object.defineProperty(document, "cookie", { writable: true, value: "__csrf=test-csrf-token" });
});

const baseOccurrence = {
  id: "occ-1",
  scheduledDate: new Date(),
  status: "due",
  notes: null,
  actualMinutes: null,
  taskTemplate: {
    title: "Aspirateur salon",
    category: null,
    room: "Salon",
    icon: null,
    estimatedMinutes: 20,
    color: "#E57373",
    isCollective: false,
  },
  assignedMember: { id: "m1", displayName: "Pierre", color: "#E57373" },
};

const mockMembers = [
  { id: "m1", displayName: "Pierre" },
  { id: "m2", displayName: "Marie" },
];

describe("OccurrenceCard", () => {
  test("renders task title and member name", () => {
    render(<OccurrenceCard occurrence={baseOccurrence} members={mockMembers} />);
    expect(screen.getByText("Aspirateur salon")).toBeInTheDocument();
    expect(screen.getByText("Pierre")).toBeInTheDocument();
  });

  test("shows room name and estimated time", () => {
    render(<OccurrenceCard occurrence={baseOccurrence} members={mockMembers} />);
    expect(screen.getByText("Salon")).toBeInTheDocument();
    expect(screen.getByText("20 min")).toBeInTheDocument();
  });

  test("shows Terminer and Passer buttons for due tasks", () => {
    render(<OccurrenceCard occurrence={baseOccurrence} members={mockMembers} />);
    expect(screen.getByText("Terminer")).toBeInTheDocument();
    expect(screen.getByText("Passer")).toBeInTheDocument();
  });

  test("clicking Terminer calls fetch with /complete endpoint", async () => {
    const user = userEvent.setup();
    render(<OccurrenceCard occurrence={baseOccurrence} members={mockMembers} currentMemberId="m1" />);
    await user.click(screen.getByText("Terminer"));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/occurrences/occ-1/complete",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("clicking Passer calls fetch with /skip endpoint", async () => {
    const user = userEvent.setup();
    render(<OccurrenceCard occurrence={baseOccurrence} members={mockMembers} currentMemberId="m1" />);
    await user.click(screen.getByText("Passer"));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/occurrences/occ-1/skip",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("completed tasks show Remettre à faire button instead", () => {
    const completed = { ...baseOccurrence, status: "completed" };
    render(<OccurrenceCard occurrence={completed} members={mockMembers} />);
    expect(screen.getByText("Remettre à faire")).toBeInTheDocument();
    expect(screen.queryByText("Terminer")).not.toBeInTheDocument();
    expect(screen.queryByText("Passer")).not.toBeInTheDocument();
  });

  test("clicking Remettre à faire calls /reopen endpoint", async () => {
    const user = userEvent.setup();
    const completed = { ...baseOccurrence, status: "completed" };
    render(<OccurrenceCard occurrence={completed} members={mockMembers} currentMemberId="m1" />);
    await user.click(screen.getByText("Remettre à faire"));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/occurrences/occ-1/reopen",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("compact mode hides action buttons", () => {
    render(<OccurrenceCard occurrence={baseOccurrence} members={mockMembers} compact />);
    expect(screen.queryByText("Terminer")).not.toBeInTheDocument();
    expect(screen.queryByText("Passer")).not.toBeInTheDocument();
  });

  test("overdue tasks show reschedule buttons", () => {
    const overdue = { ...baseOccurrence, status: "overdue" };
    render(<OccurrenceCard occurrence={overdue} members={mockMembers} />);
    expect(screen.getByText("Demain")).toBeInTheDocument();
    expect(screen.getByText("Après-demain")).toBeInTheDocument();
    expect(screen.getByText("Week-end")).toBeInTheDocument();
  });

  test("clicking Demain calls /reschedule endpoint", async () => {
    const user = userEvent.setup();
    const overdue = { ...baseOccurrence, status: "overdue" };
    render(<OccurrenceCard occurrence={overdue} members={mockMembers} currentMemberId="m1" />);
    await user.click(screen.getByText("Demain"));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/occurrences/occ-1/reschedule",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("shows collective badge for collective tasks", () => {
    const collective = {
      ...baseOccurrence,
      taskTemplate: { ...baseOccurrence.taskTemplate, isCollective: true },
    };
    render(<OccurrenceCard occurrence={collective} members={mockMembers} />);
    expect(screen.getByText("Coll.")).toBeInTheDocument();
  });

  test("shows reschedule count when present", () => {
    const rescheduled = { ...baseOccurrence, rescheduleCount: 3 };
    render(<OccurrenceCard occurrence={rescheduled} members={mockMembers} />);
    expect(screen.getByText("Reportée ×3")).toBeInTheDocument();
  });

  test("shows notes when present and not compact", () => {
    const withNotes = { ...baseOccurrence, notes: "Nettoyer sous le canapé" };
    render(<OccurrenceCard occurrence={withNotes} members={mockMembers} />);
    expect(screen.getByText("Nettoyer sous le canapé")).toBeInTheDocument();
  });

  test("hides notes in compact mode", () => {
    const withNotes = { ...baseOccurrence, notes: "Nettoyer sous le canapé" };
    render(<OccurrenceCard occurrence={withNotes} members={mockMembers} compact />);
    expect(screen.queryByText("Nettoyer sous le canapé")).not.toBeInTheDocument();
  });
});
