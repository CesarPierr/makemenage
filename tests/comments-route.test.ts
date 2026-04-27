import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { taskOccurrence: { findFirst: vi.fn() }, occurrenceComment: { findMany: vi.fn(), create: vi.fn() }, householdMember: { findFirst: vi.fn() } } }));
vi.mock("@/lib/logger", () => ({ logError: vi.fn() }));

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "@/app/api/occurrences/[id]/comments/route";

const mockUser = { id: "user-1" };
const mockOccurrence = { id: "occ-1", householdId: "h-1" };

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue(mockUser as never);
  vi.mocked(db.taskOccurrence.findFirst).mockResolvedValue(mockOccurrence as never);
  vi.mocked(db.householdMember.findFirst).mockResolvedValue({ id: "m-1", userId: "user-1", householdId: "h-1" } as never);
});

describe("GET /api/occurrences/[id]/comments", () => {
  it("returns empty array when no comments", async () => {
    vi.mocked(db.occurrenceComment.findMany).mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/occurrences/occ-1/comments");
    const res = await GET(req, { params: Promise.resolve({ id: "occ-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns 404 when occurrence not in user household", async () => {
    vi.mocked(db.taskOccurrence.findFirst).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/occurrences/occ-1/comments");
    const res = await GET(req, { params: Promise.resolve({ id: "occ-1" }) });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/occurrences/[id]/comments", () => {
  it("returns 400 when body is missing", async () => {
    const formData = new FormData();
    const req = new NextRequest("http://localhost/api/occurrences/occ-1/comments", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: "occ-1" }) });
    expect(res.status).toBe(400);
  });

  it("creates and returns a comment", async () => {
    const now = new Date();
    vi.mocked(db.householdMember.findFirst).mockResolvedValue({ id: "m-1", userId: "user-1" } as never);
    vi.mocked(db.occurrenceComment.create).mockResolvedValue({
      id: "c-1",
      body: "Test",
      author: { displayName: "Pierre" },
      createdAt: now,
    } as never);

    const formData = new FormData();
    formData.set("body", "Test");
    const req = new NextRequest("http://localhost/api/occurrences/occ-1/comments", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req, { params: Promise.resolve({ id: "occ-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.body).toBe("Test");
    expect(data.authorName).toBe("Pierre");
  });
});
