import "server-only";

import { addDays } from "date-fns";
import { randomBytes } from "node:crypto";

import type { HouseholdRole, User } from "@prisma/client";

import { memberPalette } from "@/lib/constants";
import { db } from "@/lib/db";
import { canManageHousehold } from "@/lib/households";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInviteCode(length = 8) {
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]).join("");
}

export function pickNextMemberColor(existingColors: string[]) {
  const normalized = new Set(existingColors.map((color) => color.toUpperCase()));

  return memberPalette.find((color) => !normalized.has(color.toUpperCase())) ?? memberPalette[0];
}

async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomInviteCode();
    const existing = await db.householdInvite.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique invite code");
}

export async function createHouseholdInvite(params: {
  householdId: string;
  createdByMemberId: string;
  role: HouseholdRole;
  expiresInDays: number;
}) {
  const code = await generateUniqueInviteCode();

  return db.householdInvite.create({
    data: {
      householdId: params.householdId,
      createdByMemberId: params.createdByMemberId,
      role: params.role,
      code,
      token: randomBytes(24).toString("hex"),
      expiresAt: addDays(new Date(), params.expiresInDays),
    },
  });
}

export async function getShareableInvite(tokenOrCode: { token?: string; code?: string }) {
  const invite = tokenOrCode.token
    ? await db.householdInvite.findUnique({
        where: { token: tokenOrCode.token },
        include: {
          household: true,
          createdByMember: true,
        },
      })
    : tokenOrCode.code
      ? await db.householdInvite.findUnique({
          where: { code: tokenOrCode.code.toUpperCase() },
          include: {
            household: true,
            createdByMember: true,
          },
        })
      : null;

  return invite;
}

export function getInviteState(invite: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
} | null) {
  if (!invite) {
    return "missing" as const;
  }

  if (invite.revokedAt) {
    return "revoked" as const;
  }

  if (invite.acceptedAt) {
    return "used" as const;
  }

  if (invite.expiresAt < new Date()) {
    return "expired" as const;
  }

  return "active" as const;
}

export async function acceptHouseholdInvite(params: {
  inviteToken?: string;
  inviteCode?: string;
  user: Pick<User, "id" | "displayName">;
}) {
  const invite = await getShareableInvite({
    token: params.inviteToken,
    code: params.inviteCode,
  });
  const state = getInviteState(invite);

  if (!invite || state !== "active") {
    return {
      status: state,
      invite: null,
      membership: null,
    } as const;
  }

  const existingMembership = await db.householdMember.findFirst({
    where: {
      householdId: invite.householdId,
      userId: params.user.id,
    },
  });

  if (existingMembership) {
    return {
      status: "already_member" as const,
      invite,
      membership: existingMembership,
    };
  }

  const membership = await db.$transaction(async (tx) => {
    const existingColors = await tx.householdMember.findMany({
      where: {
        householdId: invite.householdId,
      },
      select: {
        color: true,
      },
    });

    const createdMembership = await tx.householdMember.create({
      data: {
        householdId: invite.householdId,
        userId: params.user.id,
        displayName: params.user.displayName,
        color: pickNextMemberColor(existingColors.map((entry) => entry.color)),
        role: invite.role,
      },
    });

    await tx.householdInvite.update({
      where: {
        id: invite.id,
      },
      data: {
        acceptedAt: new Date(),
        acceptedByUserId: params.user.id,
      },
    });

    return createdMembership;
  });

  await syncHouseholdOccurrences(invite.householdId);

  return {
    status: "joined" as const,
    invite,
    membership,
  };
}

export async function leaveHousehold(params: {
  householdId: string;
  userId: string;
}) {
  const membership = await db.householdMember.findFirst({
    where: {
      householdId: params.householdId,
      userId: params.userId,
    },
    include: {
      household: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!membership) {
    return {
      status: "not_found" as const,
      nextHouseholdId: null,
    };
  }

  const otherLinkedMembers = membership.household.members.filter(
    (member) => member.id !== membership.id && Boolean(member.userId),
  );
  const otherLinkedManagers = otherLinkedMembers.filter((member) => canManageHousehold(member.role));

  if (!otherLinkedMembers.length) {
    return {
      status: "last_account" as const,
      nextHouseholdId: membership.householdId,
    };
  }

  if (canManageHousehold(membership.role) && !otherLinkedManagers.length) {
    return {
      status: "last_manager" as const,
      nextHouseholdId: membership.householdId,
    };
  }

  await db.householdMember.update({
    where: {
      id: membership.id,
    },
    data: {
      userId: null,
      isActive: false,
    },
  });

  await syncHouseholdOccurrences(membership.householdId);

  const nextMembership = await db.householdMember.findFirst({
    where: {
      userId: params.userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      householdId: true,
    },
  });

  return {
    status: "left" as const,
    nextHouseholdId: nextMembership?.householdId ?? null,
  };
}
