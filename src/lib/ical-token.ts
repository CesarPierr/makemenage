import "server-only";

import crypto from "crypto";

function secret() {
  const s = process.env.ICAL_SECRET ?? process.env.AUTH_SECRET ?? "dev-secret";
  return s;
}

/**
 * Creates a URL-safe HMAC token scoped to a household (and optionally a member).
 * Format: base64url(householdId:memberId?):signature
 */
export function generateIcalToken(householdId: string, memberId?: string): string {
  const payload = memberId ? `${householdId}:${memberId}` : householdId;
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

type IcalTokenPayload = { householdId: string; memberId?: string };

export function verifyIcalToken(token: string): IcalTokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  const payload = Buffer.from(encoded, "base64url").toString();
  const parts = payload.split(":");
  if (parts.length < 1) return null;

  return {
    householdId: parts[0],
    memberId: parts[1] ?? undefined,
  };
}
