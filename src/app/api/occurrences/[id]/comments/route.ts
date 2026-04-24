import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Verify the occurrence belongs to a household the user is in
    const occurrence = await db.taskOccurrence.findFirst({
      where: {
        id,
        household: { members: { some: { userId: user.id } } },
      },
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

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const formData = await request.formData();
    const body = (formData.get("body") as string | null)?.trim();
    const memberId = formData.get("memberId") as string | null;

    if (!body) return NextResponse.json({ error: "body requis" }, { status: 400 });

    // Verify occurrence belongs to a household the user is in
    const occurrence = await db.taskOccurrence.findFirst({
      where: {
        id,
        household: { members: { some: { userId: user.id } } },
      },
    });
    if (!occurrence) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Resolve author — prefer the explicitly sent memberId if it belongs to user
    let authorId: string | null = null;
    if (memberId) {
      const member = await db.householdMember.findFirst({
        where: { id: memberId, userId: user.id },
      });
      if (member) authorId = member.id;
    }
    if (!authorId) {
      const member = await db.householdMember.findFirst({
        where: { userId: user.id, householdId: occurrence.householdId },
      });
      authorId = member?.id ?? null;
    }

    const comment = await db.occurrenceComment.create({
      data: { occurrenceId: id, authorId, body },
      include: { author: { select: { displayName: true } } },
    });

    return NextResponse.json({
      id: comment.id,
      body: comment.body,
      authorName: comment.author?.displayName ?? "Inconnu",
      createdAt: comment.createdAt.toISOString(),
    });
  } catch (err) {
    logError("comments.post", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
