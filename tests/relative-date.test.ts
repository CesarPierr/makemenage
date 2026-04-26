import { describe, expect, it } from "vitest";

import { classifyRelative, formatRelative } from "@/lib/relative-date";

const now = new Date(2026, 3, 25); // 2026-04-25

describe("formatRelative", () => {
  it("returns named keywords for ±0/1/2 days", () => {
    expect(formatRelative(new Date(2026, 3, 25), { now })).toBe("aujourd'hui");
    expect(formatRelative(new Date(2026, 3, 26), { now })).toBe("demain");
    expect(formatRelative(new Date(2026, 3, 27), { now })).toBe("après-demain");
    expect(formatRelative(new Date(2026, 3, 24), { now })).toBe("hier");
    expect(formatRelative(new Date(2026, 3, 23), { now })).toBe("avant-hier");
  });

  it("formats short within 30 days", () => {
    // +5 days = 5 j
    expect(formatRelative(new Date(2026, 3, 30), { now })).toBe("dans 5 j");
    // +9 days = 1 sem 2 j
    expect(formatRelative(new Date(2026, 4, 4), { now })).toBe("dans 1 sem 2 j");
    // +21 days = 3 sem (no remainder)
    expect(formatRelative(new Date(2026, 4, 16), { now })).toBe("dans 3 sem");
    // -10 days = il y a 1 sem 3 j
    expect(formatRelative(new Date(2026, 3, 15), { now })).toBe("il y a 1 sem 3 j");
  });

  it("formats long within 30 days", () => {
    expect(formatRelative(new Date(2026, 4, 4), { now, style: "long" })).toBe("dans 1 semaine 2 jours");
    expect(formatRelative(new Date(2026, 4, 16), { now, style: "long" })).toBe("dans 3 semaines");
  });

  it("falls back to absolute beyond 30 days", () => {
    // +60 days = 2026-06-24
    const result = formatRelative(new Date(2026, 5, 24), { now });
    expect(result).toMatch(/24/);
  });

  it("includes year when target is in another year", () => {
    const result = formatRelative(new Date(2027, 0, 5), { now });
    expect(result).toMatch(/2027/);
  });
});

describe("classifyRelative", () => {
  it("classifies late tiers", () => {
    expect(classifyRelative(new Date(2026, 3, 23), now)).toEqual({ kind: "slightly-late", daysLate: 2 });
    expect(classifyRelative(new Date(2026, 3, 20), now)).toEqual({ kind: "late", daysLate: 5 });
    expect(classifyRelative(new Date(2026, 3, 15), now)).toEqual({ kind: "very-late", daysLate: 10 });
  });

  it("classifies today/soon/future", () => {
    expect(classifyRelative(new Date(2026, 3, 25), now)).toEqual({ kind: "today" });
    expect(classifyRelative(new Date(2026, 3, 27), now)).toEqual({ kind: "soon", daysAhead: 2 });
    expect(classifyRelative(new Date(2026, 4, 10), now)).toEqual({ kind: "future", daysAhead: 15 });
  });
});
