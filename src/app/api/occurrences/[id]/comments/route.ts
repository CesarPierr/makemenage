import { NextRequest, NextResponse } from "next/server";

import { withOccurrence } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const occurrence = await db.taskOccurrence.findFirst({
      where: {
        id,
        household: { members: { some: { userId: user.id } } },
      },
      select: { id: true },
    });
    if (!occurrence) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const comments = await db.occurrenceComment.findMany({
      where: { occurrenceId: id },
      include: { author: { select: { displayName: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      comments.map((c) => ({
        id: c.id,
        body: c.body,
        authorName: c.author?.displayName ?? "Inconnu",
        createdAt: c.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    logError("comments.get", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export const POST = withOccurrence<{ id: string }>(
  async ({ formData, occurrence, membership }) => {
    const body = formData.get("body")?.toString().trim();

    if (!body) {
      return NextResponse.json({ error: "body requis" }, { status: 400 });
    }

    const comment = await db.occurrenceComment.create({
      data: { occurrenceId: occurrence.id, authorId: membership.id, body },
      include: { author: { select: { displayName: true } } },
    });

    return NextResponse.json({
      id: comment.id,
      body: comment.body,
      authorName: comment.author?.displayName ?? "Inconnu",
      createdAt: comment.createdAt.toISOString(),
    });
  },
);
